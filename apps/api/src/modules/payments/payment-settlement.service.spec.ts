import { Decimal } from 'decimal.js';

import { Currency, PaymentChannel, PaymentStatus } from '@ircub/shared';

import { PaymentSettlementService } from './payment-settlement.service';
import { PAYMENTS_MESSAGES } from './payments.messages';

function paymentRow(status: PaymentStatus) {
  return {
    id: 'pay-1',
    payerId: 'payer-1',
    channel: PaymentChannel.BANK,
    channelTxnRef: status === PaymentStatus.FAILED ? null : 'BNK-1',
    controlNumber: '000000000195',
    assessmentId: 'asm-1',
    billId: null,
    status,
    amount: '100.00',
    currency: Currency.USD,
    localAmount: new Decimal('57150.00'),
    failureReason: null,
    paidAt: null,
  };
}

function build(status: PaymentStatus) {
  const updates: { where: { id: string }; data: Record<string, unknown> }[] = [];
  let row = paymentRow(status);
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    payment: {
      findUnique: jest.fn().mockImplementation(() => Promise.resolve(row)),
      update: jest.fn().mockImplementation((args: (typeof updates)[number]) => {
        updates.push(args);
        row = { ...row, ...(args.data as Partial<typeof row>) };
        return Promise.resolve(row);
      }),
    },
  };
  const prisma = {
    ...tx,
    payment: {
      ...tx.payment,
      findFirst: jest.fn().mockImplementation(() => Promise.resolve({ id: row.id })),
    },
    $transaction: (fn: (client: typeof tx) => Promise<unknown>) => fn(tx),
  };
  const assessments = { applyPayment: jest.fn().mockResolvedValue({}) };
  const service = new PaymentSettlementService(
    prisma as never,
    assessments as never,
    { applyPayment: jest.fn() } as never,
    { emit: jest.fn() } as never,
    { markDirty: jest.fn() } as never,
  );
  return { service, updates, assessments, prisma };
}

const success = { status: 'SUCCESS' as const, amount: '100.00', currency: Currency.USD };

describe('PaymentSettlementService', () => {
  it('applies a late SUCCESS to a PERMANENTLY_FAILED payment and clears the failure markers', async () => {
    const { service, updates, assessments } = build(PaymentStatus.PERMANENTLY_FAILED);
    const result = await service.settle('pay-1', success, 'CALLBACK', {});
    expect(result).toMatchObject({ duplicate: false, status: PaymentStatus.CONFIRMED });
    expect(assessments.applyPayment).toHaveBeenCalledTimes(1);
    expect(updates[0]?.data).toMatchObject({
      status: PaymentStatus.CONFIRMED,
      permanentlyFailedAt: null,
      failureReason: null,
    });
  });

  it('answers duplicate for a payment that is already CONFIRMED', async () => {
    const { service, updates } = build(PaymentStatus.CONFIRMED);
    const result = await service.settle('pay-1', success, 'STATUS_CHECK', {});
    expect(result).toMatchObject({ duplicate: true, status: PaymentStatus.CONFIRMED });
    expect(updates).toHaveLength(0);
  });

  it('marks PERMANENTLY_FAILED only while the locked row is still PENDING', async () => {
    const pending = build(PaymentStatus.PENDING);
    const failed = await pending.service.markPermanentlyFailed(
      'pay-1',
      PAYMENTS_MESSAGES.PERMANENTLY_FAILED,
    );
    expect(failed?.status).toBe(PaymentStatus.PERMANENTLY_FAILED);
    expect(pending.updates[0]?.data).toMatchObject({ permanentlyFailedAt: expect.any(Date) });

    const confirmed = build(PaymentStatus.CONFIRMED);
    expect(
      await confirmed.service.markPermanentlyFailed('pay-1', PAYMENTS_MESSAGES.PERMANENTLY_FAILED),
    ).toBeNull();
    expect(confirmed.updates).toHaveLength(0);
  });

  it('adopts the channel reference from a callback naming a FAILED-at-initiation payment', async () => {
    const { service, updates, prisma } = build(PaymentStatus.FAILED);
    prisma.payment.findUnique
      .mockResolvedValueOnce(null) // no payment knows this txnRef yet
      .mockImplementation(() => Promise.resolve({ ...paymentRow(PaymentStatus.FAILED) }));
    const result = await service.settleByReference(
      PaymentChannel.BANK,
      'BNK-NEW',
      success,
      'CALLBACK',
      {},
      'pay-1',
    );
    expect(result.status).toBe(PaymentStatus.CONFIRMED);
    expect(updates[0]).toMatchObject({
      where: { id: 'pay-1' },
      data: { channelTxnRef: 'BNK-NEW' },
    });
    expect(prisma.payment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'pay-1', channelTxnRef: null }),
      }),
    );
  });
});
