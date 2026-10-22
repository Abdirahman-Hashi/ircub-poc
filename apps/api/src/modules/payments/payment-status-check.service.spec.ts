import {
  ChannelOutcome,
  Currency,
  PaymentChannel,
  PaymentStatus,
  PERMISSIONS,
} from '@ircub/shared';
import type { ChannelStatusResponse } from '@ircub/shared';

import { SSE_EVENT } from '../../common/sse/event-names';
import { SystemConfigKey } from '../system-config/system-config.keys';

import { PaymentStatusCheckService } from './payment-status-check.service';
import { PAYMENTS_MESSAGES } from './payments.messages';

const RETRY_LIMIT = 3;

function pendingPayment(attempts: number) {
  return {
    id: 'pay-1',
    payerId: 'payer-1',
    channel: PaymentChannel.BANK,
    channelTxnRef: 'BNK-1',
    controlNumber: '000000000000',
    status: PaymentStatus.PENDING,
    statusCheckAttempts: attempts,
    localAmount: { toFixed: () => '100.00' },
  };
}

function build(options: { attempts: number; channelReply: ChannelStatusResponse | Error }) {
  const updates: unknown[] = [];
  const sent: unknown[] = [];
  const emitted: unknown[] = [];
  const prisma = {
    payment: {
      findUnique: jest.fn().mockResolvedValue(pendingPayment(options.attempts)),
      update: jest.fn().mockImplementation((args: unknown) => {
        updates.push(args);
        return Promise.resolve({});
      }),
    },
    user: {
      findMany: jest
        .fn()
        .mockResolvedValue([{ email: 'supervisor@ircub.test' }, { email: 'admin@ircub.test' }]),
    },
  };
  const client = {
    status: jest
      .fn()
      .mockImplementation(() =>
        options.channelReply instanceof Error
          ? Promise.reject(options.channelReply)
          : Promise.resolve(options.channelReply),
      ),
  };
  const settlement = { settle: jest.fn().mockResolvedValue({ duplicate: false }) };
  const notifications = {
    sendNow: jest.fn().mockImplementation((input: unknown) => {
      sent.push(input);
      return Promise.resolve({});
    }),
  };
  const permissions = { userIdsHolding: jest.fn().mockResolvedValue(['u-sup', 'u-admin']) };
  const systemConfig = {
    get: jest
      .fn()
      .mockImplementation((key: SystemConfigKey) =>
        Promise.resolve(key === SystemConfigKey.PAYMENT_STATUS_RETRY_LIMIT ? RETRY_LIMIT : 0),
      ),
  };
  const events = {
    emit: jest
      .fn()
      .mockImplementation((type: unknown, data: unknown) => emitted.push({ type, data })),
  };
  const service = new PaymentStatusCheckService(
    prisma as never,
    { clientFor: () => client } as never,
    settlement as never,
    notifications as never,
    permissions as never,
    systemConfig as never,
    { register: jest.fn() } as never,
    events as never,
    { raise: jest.fn().mockResolvedValue(null) } as never,
  );
  return { service, updates, sent, emitted, settlement, permissions };
}

const pendingReply: ChannelStatusResponse = {
  txnRef: 'BNK-1',
  status: ChannelOutcome.PENDING,
  amount: '100.00',
  currency: Currency.SOS,
  controlNumber: '000000000000',
  paidAt: null,
};

describe('PaymentStatusCheckService', () => {
  it('counts a pending answer and throws so pg-boss retries', async () => {
    const { service, updates } = build({ attempts: 0, channelReply: pendingReply });
    await expect(service.check('pay-1')).rejects.toThrow(PAYMENTS_MESSAGES.STATUS_STILL_PENDING);
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({ data: { statusCheckAttempts: 1 } });
  });

  it('treats a channel error like a pending answer', async () => {
    const { service, updates } = build({ attempts: 1, channelReply: new Error('boom') });
    await expect(service.check('pay-1')).rejects.toThrow(PAYMENTS_MESSAGES.STATUS_STILL_PENDING);
    expect(updates[0]).toMatchObject({ data: { statusCheckAttempts: 2 } });
  });

  it('settles a final answer through the settlement service', async () => {
    const { service, settlement, updates } = build({
      attempts: 0,
      channelReply: {
        ...pendingReply,
        status: ChannelOutcome.SUCCESS,
        paidAt: '2026-10-21T10:00:00.000Z',
      },
    });
    await service.check('pay-1');
    expect(settlement.settle).toHaveBeenCalledWith(
      'pay-1',
      expect.objectContaining({ status: ChannelOutcome.SUCCESS, amount: '100.00' }),
      'STATUS_CHECK',
      expect.anything(),
    );
    expect(updates).toHaveLength(0);
  });

  it('marks PERMANENTLY_FAILED at the limit and e-mails every holder of payments.supervise', async () => {
    const { service, updates, sent, emitted, permissions } = build({
      attempts: RETRY_LIMIT - 1,
      channelReply: pendingReply,
    });
    await expect(service.check('pay-1')).resolves.toBeUndefined();
    expect(updates[0]).toMatchObject({ data: { statusCheckAttempts: RETRY_LIMIT } });
    expect(updates[1]).toMatchObject({
      data: { status: PaymentStatus.PERMANENTLY_FAILED, permanentlyFailedAt: expect.any(Date) },
    });
    expect(permissions.userIdsHolding).toHaveBeenCalledWith(PERMISSIONS.PAYMENTS_SUPERVISE);
    expect(sent.map((s) => (s as { to: string }).to)).toEqual([
      'supervisor@ircub.test',
      'admin@ircub.test',
    ]);
    expect(emitted.map((e) => (e as { type: string }).type)).toEqual([
      SSE_EVENT.PAYMENT_PERMANENTLY_FAILED,
      SSE_EVENT.PAYMENT_UPDATED,
    ]);
  });

  it('is a no-op when the payment is no longer pending', async () => {
    const { service, updates, settlement } = build({ attempts: 0, channelReply: pendingReply });
    (
      service as unknown as { prisma: { payment: { findUnique: jest.Mock } } }
    ).prisma.payment.findUnique.mockResolvedValue({
      ...pendingPayment(0),
      status: PaymentStatus.CONFIRMED,
    });
    await service.check('pay-1');
    expect(updates).toHaveLength(0);
    expect(settlement.settle).not.toHaveBeenCalled();
  });
});
