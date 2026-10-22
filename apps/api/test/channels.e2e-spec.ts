import './helpers/channels-env';

import { createHmac } from 'node:crypto';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import request from 'supertest';

import {
  type AssessmentView,
  CHANNEL,
  Currency,
  ErrorCode,
  PaymentChannel,
  PaymentStatus,
  ReconciliationLineStatus,
  ReconciliationRunStatus,
} from '@ircub/shared';

import { AppModule as MocksAppModule } from '../../mocks/src/app.module';
import { SystemConfigKey } from '../src/modules/system-config/system-config.keys';
import { PrismaService } from '../src/prisma/prisma.service';

import { createAssessment, registerPayer, revenueTypeByCode } from './helpers/registry';
import { createTestApp, loginAs, SEED, type TestSession } from './helpers/test-app';
import { E2E_PORTS, TEST_ENV } from './test-env.constants';

import type { INestApplication } from '@nestjs/common';

const SHORT_DELAY_SECONDS = 1;
const POLL_MS = 500;
const SETTLE_TIMEOUT_MS = 15_000;
const PERMANENT_FAILURE_TIMEOUT_MS = 40_000;
const TODAY = new Date().toISOString().slice(0, 'YYYY-MM-DD'.length);

async function waitFor<T>(
  read: () => Promise<T>,
  done: (value: T) => boolean,
  timeoutMs: number,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let last = await read();
  while (!done(last) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    last = await read();
  }
  return last;
}

describe('online payment channels (e2e)', () => {
  let mocks: INestApplication;
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: TestSession;
  let officer: TestSession;
  let customer: TestSession;
  let assessment: AssessmentView;

  const bearer = (s: TestSession): string => `Bearer ${s.accessToken}`;
  const setConfig = (key: SystemConfigKey, value: number) =>
    request(app.getHttpServer())
      .put(`/config/${key}`)
      .set('Authorization', bearer(admin))
      .send({ value })
      .expect(200);
  const getPayment = async (id: string) =>
    (
      await request(app.getHttpServer())
        .get(`/payments/${id}`)
        .set('Authorization', bearer(officer))
        .expect(200)
    ).body as Record<string, unknown>;
  const initiate = async (
    channel: PaymentChannel,
    amount: string,
  ): Promise<Record<string, unknown>> => {
    const res = await request(app.getHttpServer())
      .post('/payments/initiate')
      .set('Authorization', bearer(officer))
      .send({ controlNumber: assessment.controlNumber, amount, currency: Currency.SOS, channel })
      .expect(201);
    return res.body as Record<string, unknown>;
  };
  const untilStatus = (id: string, status: PaymentStatus, timeoutMs: number) =>
    waitFor(
      () => getPayment(id),
      (p) => p.status === status,
      timeoutMs,
    );

  beforeAll(async () => {
    mocks = await NestFactory.create(MocksAppModule, { logger: false });
    mocks.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await mocks.listen(E2E_PORTS.MOCKS);

    app = await createTestApp();
    await app.listen(E2E_PORTS.API);
    prisma = app.get(PrismaService);
    admin = await loginAs(app, SEED.ADMIN);
    officer = await loginAs(app, SEED.OFFICER);
    customer = await loginAs(app, SEED.CUSTOMER);
    await setConfig(SystemConfigKey.PAYMENT_STATUS_CHECK_DELAY_SECONDS, SHORT_DELAY_SECONDS);
    await setConfig(SystemConfigKey.PAYMENT_STATUS_RETRY_DELAY_SECONDS, SHORT_DELAY_SECONDS);

    const payer = await registerPayer(app, officer);
    const licence = await revenueTypeByCode(app, officer, 'BUSINESS_LICENCE');
    assessment = await createAssessment(app, officer, payer.id, licence.id); // 150000 SOS
  });

  afterAll(async () => {
    await app.close();
    await mocks.close();
  });

  it('initiates a bank payment, receives the signed callback and confirms it', async () => {
    const pending = await initiate(PaymentChannel.BANK, '100.00');
    expect(pending).toMatchObject({ status: PaymentStatus.PENDING, channel: PaymentChannel.BANK });
    expect(String(pending.channelTxnRef)).toMatch(new RegExp(`^${CHANNEL.BANK_REF_PREFIX}`));

    const confirmed = await untilStatus(
      String(pending.id),
      PaymentStatus.CONFIRMED,
      SETTLE_TIMEOUT_MS,
    );
    expect(confirmed.status).toBe(PaymentStatus.CONFIRMED);
    expect(confirmed.paidAt).not.toBeNull();
    expect(confirmed.channelRequestPayload).toMatchObject({
      callbackUrl: `${TEST_ENV.API_PUBLIC_URL.replace(/:\d+$/, '')}:${E2E_PORTS.API}/payments/callback/${PaymentChannel.BANK}`,
    });
    expect(confirmed.callbackPayload).toMatchObject({ status: 'SUCCESS', amount: '100.00' });

    const ledger = await request(app.getHttpServer())
      .get(`/assessments/${assessment.id}`)
      .set('Authorization', bearer(officer))
      .expect(200);
    expect(ledger.body.paidAmount).toBe('100');
  });

  it('rejects a tampered callback and treats a replay as an idempotent duplicate', async () => {
    const pending = await initiate(PaymentChannel.BANK, '10.00');
    const confirmed = await untilStatus(
      String(pending.id),
      PaymentStatus.CONFIRMED,
      SETTLE_TIMEOUT_MS,
    );
    const body = JSON.stringify(confirmed.callbackPayload);
    const sign = (payload: string, secret: string): string =>
      createHmac(CHANNEL.SIGNATURE_ALGORITHM, secret).update(payload).digest('hex');

    const tampered = await request(app.getHttpServer())
      .post(`/payments/callback/${PaymentChannel.BANK}`)
      .set('content-type', 'application/json')
      .set(CHANNEL.SIGNATURE_HEADER, sign(body, 'wrong-secret'))
      .send(body)
      .expect(401);
    expect(tampered.body.code).toBe(ErrorCode.INVALID_SIGNATURE);

    const replay = await request(app.getHttpServer())
      .post(`/payments/callback/${PaymentChannel.BANK}`)
      .set('content-type', 'application/json')
      .set(CHANNEL.SIGNATURE_HEADER, sign(body, TEST_ENV.MOCK_SHARED_SECRET))
      .send(body)
      .expect(200);
    expect(replay.body).toMatchObject({ duplicate: true, status: PaymentStatus.CONFIRMED });
  });

  it(
    'marks a payment PERMANENTLY_FAILED after the status-check limit and notifies supervisors',
    async () => {
      const pending = await initiate(PaymentChannel.MOBILE_MONEY, '50.66');
      const failed = await untilStatus(
        String(pending.id),
        PaymentStatus.PERMANENTLY_FAILED,
        PERMANENT_FAILURE_TIMEOUT_MS,
      );
      expect(failed).toMatchObject({
        status: PaymentStatus.PERMANENTLY_FAILED,
        statusCheckAttempts: 3,
      });
      expect(failed.permanentlyFailedAt).not.toBeNull();

      const notifications = await request(app.getHttpServer())
        .get('/notifications')
        .query({ relatedType: 'Payment', relatedId: String(pending.id) })
        .set('Authorization', bearer(admin))
        .expect(200);
      const recipients = (notifications.body.items as { to: string }[]).map((n) => n.to);
      expect(recipients).toEqual(expect.arrayContaining([SEED.SUPERVISOR]));
      expect(recipients).not.toContain(SEED.OFFICER);
    },
    PERMANENT_FAILURE_TIMEOUT_MS + SETTLE_TIMEOUT_MS,
  );

  it('lets a customer pay only their own control numbers', async () => {
    const res = await request(app.getHttpServer())
      .post('/me/payments/initiate')
      .set('Authorization', bearer(customer))
      .send({
        controlNumber: assessment.controlNumber,
        amount: '5.00',
        currency: Currency.SOS,
        channel: PaymentChannel.BANK,
      })
      .expect(403);
    expect(res.body.code).toBe(ErrorCode.NOT_OWN_PAYER);
  });

  it('reconciles a perturbed mobile-money statement: 1 missing in IRCUB, 1 missing in channel, 1 mismatch', async () => {
    const dayStart = new Date(`${TODAY}T00:00:00.000Z`);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    const baseline = await prisma.payment.count({
      where: {
        channel: PaymentChannel.MOBILE_MONEY,
        status: { in: [PaymentStatus.CONFIRMED, PaymentStatus.REVERSED] },
        channelTxnRef: { not: null },
        paidAt: { gte: dayStart, lt: dayEnd },
      },
    });
    // The mock drops the first line, nudges the second by 0.01 and appends an unknown one.
    const ids: string[] = [];
    for (const amount of ['11.00', '12.00', '13.00']) {
      ids.push(String((await initiate(PaymentChannel.MOBILE_MONEY, amount)).id));
    }
    for (const id of ids) {
      expect((await untilStatus(id, PaymentStatus.CONFIRMED, SETTLE_TIMEOUT_MS)).status).toBe(
        PaymentStatus.CONFIRMED,
      );
    }

    const run = await request(app.getHttpServer())
      .post('/reconciliation/runs')
      .set('Authorization', bearer(admin))
      .send({ channel: PaymentChannel.MOBILE_MONEY, date: TODAY, perturb: true })
      .expect(201);
    expect(run.body).toMatchObject({
      status: ReconciliationRunStatus.COMPLETED,
      matched: 1,
      amountMismatch: 1,
      missingInIrcub: 1,
      missingInChannel: baseline + 1,
    });

    const mismatches = await request(app.getHttpServer())
      .get(`/reconciliation/runs/${run.body.id}`)
      .query({ status: ReconciliationLineStatus.AMOUNT_MISMATCH })
      .set('Authorization', bearer(admin))
      .expect(200);
    expect(mismatches.body.lines).toHaveLength(1);
    expect(mismatches.body.lines[0]).toMatchObject({
      ircubAmount: '12.00',
      channelAmount: '12.01',
    });

    const csv = await request(app.getHttpServer())
      .get(`/reconciliation/runs/${run.body.id}/export.csv`)
      .set('Authorization', bearer(admin))
      .expect(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text.split('\n')[0]).toBe(
      'status,txn_ref,control_number,ircub_amount,channel_amount,currency,note',
    );
  }, 60_000);

  it('accepts a manually uploaded statement file', async () => {
    const matched = await getPayment(
      String(
        (
          await request(app.getHttpServer())
            .get('/payments')
            .query({
              channel: PaymentChannel.MOBILE_MONEY,
              status: PaymentStatus.CONFIRMED,
              pageSize: 1,
            })
            .set('Authorization', bearer(officer))
            .expect(200)
        ).body.items[0].id,
      ),
    );
    const paidDay = String(matched.paidAt).slice(0, 'YYYY-MM-DD'.length);
    const csv = [
      CHANNEL.STATEMENT_COLUMNS.join(','),
      [
        matched.channelTxnRef,
        paidDay,
        matched.amount,
        matched.currency,
        matched.controlNumber,
        'SUCCESS',
      ].join(','),
    ].join('\n');
    const run = await request(app.getHttpServer())
      .post('/reconciliation/statements')
      .set('Authorization', bearer(admin))
      .field('channel', PaymentChannel.MOBILE_MONEY)
      .field('date', paidDay)
      .attach('file', Buffer.from(csv), 'momo.csv')
      .expect(201);
    expect(run.body).toMatchObject({
      status: ReconciliationRunStatus.COMPLETED,
      missingInIrcub: 0,
      statementFileName: 'momo.csv',
    });
    expect(run.body.matched).toBeGreaterThanOrEqual(1);
  });
});
