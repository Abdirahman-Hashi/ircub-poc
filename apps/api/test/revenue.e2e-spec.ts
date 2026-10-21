import request from 'supertest';

import {
  AssessmentStatus,
  type AssessmentView,
  Currency,
  ErrorCode,
  PaymentChannel,
  PaymentStatus,
  ReversalStatus,
} from '@ircub/shared';

import { createAssessment, registerPayer, revenueTypeByCode } from './helpers/registry';
import { createTestApp, loginAs, SEED, type TestSession } from './helpers/test-app';

import type { INestApplication } from '@nestjs/common';

describe('revenue collection (e2e)', () => {
  let app: INestApplication;
  let officer: TestSession;
  let supervisor: TestSession;
  let assessment: AssessmentView;

  beforeAll(async () => {
    app = await createTestApp();
    officer = await loginAs(app, SEED.OFFICER);
    supervisor = await loginAs(app, SEED.SUPERVISOR);
    const payer = await registerPayer(app, officer);
    const licence = await revenueTypeByCode(app, officer, 'BUSINESS_LICENCE');
    assessment = await createAssessment(app, officer, payer.id, licence.id); // 150000 SOS
  });

  afterAll(async () => {
    await app.close();
  });

  const bearer = (s: TestSession): string => `Bearer ${s.accessToken}`;
  const capture = (body: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post('/payments/capture')
      .set('Authorization', bearer(officer))
      .send({ controlNumber: assessment.controlNumber, ...body });

  it('looks up a control number and rejects a bad check digit', async () => {
    const ok = await request(app.getHttpServer())
      .get('/payments/capture/lookup')
      .query({ controlNumber: assessment.controlNumber })
      .set('Authorization', bearer(officer))
      .expect(200);
    expect(ok.body.outstanding).toBe('150000');

    const broken = `${assessment.controlNumber.slice(0, -1)}${(Number(assessment.controlNumber.slice(-1)) + 1) % 10}`;
    const bad = await request(app.getHttpServer())
      .get('/payments/capture/lookup')
      .query({ controlNumber: broken })
      .set('Authorization', bearer(officer))
      .expect(400);
    expect(bad.body.code).toBe(ErrorCode.INVALID_CONTROL_NUMBER);
  });

  it('captures a cash payment → PART_PAID, then a USD payment converted at the stored rate', async () => {
    const cash = await capture({
      amount: '50000.00',
      currency: Currency.SOS,
      channel: PaymentChannel.CASH,
    }).expect(201);
    expect(cash.body).toMatchObject({
      status: PaymentStatus.CONFIRMED,
      localAmount: '50000',
      fxRate: '1',
    });

    const usd = await capture({
      amount: '10.00',
      currency: Currency.USD,
      channel: PaymentChannel.BANK,
      channelTxnRef: `BNK-${Date.now()}`,
    }).expect(201);
    expect(usd.body.fxRate).toBe('571.5');
    expect(usd.body.localAmount).toBe('5715');

    const detail = await request(app.getHttpServer())
      .get(`/assessments/${assessment.id}`)
      .set('Authorization', bearer(officer))
      .expect(200);
    expect(detail.body.status).toBe(AssessmentStatus.PART_PAID);
    expect(detail.body.paidAmount).toBe('55715');
    expect(detail.body.payments).toHaveLength(2);
  });

  it('rejects over-payment, a missing bank reference and a duplicate reference', async () => {
    const over = await capture({
      amount: '999999.00',
      currency: Currency.SOS,
      channel: PaymentChannel.CASH,
    }).expect(422);
    expect(over.body.code).toBe(ErrorCode.OVERPAYMENT);
    expect(over.body.details.outstanding).toBe('94285');

    const noRef = await capture({
      amount: '10.00',
      currency: Currency.SOS,
      channel: PaymentChannel.BANK,
    }).expect(400);
    expect(noRef.body.code).toBe(ErrorCode.VALIDATION_FAILED);

    const ref = `MM-${Date.now()}`;
    await capture({
      amount: '10.00',
      currency: Currency.SOS,
      channel: PaymentChannel.MOBILE_MONEY,
      channelTxnRef: ref,
    }).expect(201);
    const dup = await capture({
      amount: '10.00',
      currency: Currency.SOS,
      channel: PaymentChannel.MOBILE_MONEY,
      channelTxnRef: ref,
    }).expect(409);
    expect(dup.body.code).toBe(ErrorCode.DUPLICATE_PAYMENT);
  });

  it('filters payments by payer, channel and amount range', async () => {
    const res = await request(app.getHttpServer())
      .get('/payments')
      .query({
        payerId: assessment.payer.id,
        channel: PaymentChannel.CASH,
        amountMin: '40000',
        amountMax: '60000',
      })
      .set('Authorization', bearer(officer))
      .expect(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].localAmount).toBe('50000');
  });

  it('enforces segregation of duties on reversals and reverses the ledger on approval', async () => {
    const payments = await request(app.getHttpServer())
      .get('/payments')
      .query({ payerId: assessment.payer.id, channel: PaymentChannel.CASH })
      .set('Authorization', bearer(officer))
      .expect(200);
    const paymentId = payments.body.items[0].id as string;

    const reversal = await request(app.getHttpServer())
      .post('/reversals')
      .set('Authorization', bearer(officer))
      .send({ paymentId, reason: 'Keyed twice' })
      .expect(201);
    expect(reversal.body.status).toBe(ReversalStatus.PENDING_APPROVAL);

    // The officer holds reversals.capture only → 403 FORBIDDEN by permission.
    const noPermission = await request(app.getHttpServer())
      .post(`/reversals/${reversal.body.id}/approve`)
      .set('Authorization', bearer(officer))
      .send({})
      .expect(403);
    expect(noPermission.body.code).toBe(ErrorCode.FORBIDDEN);

    // Even the capturer *with* the permission is blocked: the supervisor captures one and tries to approve it.
    const second = await request(app.getHttpServer())
      .get('/payments')
      .query({ payerId: assessment.payer.id, channel: PaymentChannel.BANK })
      .set('Authorization', bearer(officer))
      .expect(200);
    const admin = await loginAs(app, SEED.ADMIN);
    const ownReversal = await request(app.getHttpServer())
      .post('/reversals')
      .set('Authorization', bearer(admin))
      .send({ paymentId: second.body.items[0].id, reason: 'Admin captured' });
    if (ownReversal.status === 201) {
      const sod = await request(app.getHttpServer())
        .post(`/reversals/${ownReversal.body.id}/approve`)
        .set('Authorization', bearer(admin))
        .send({})
        .expect(403);
      expect(sod.body.code).toBe(ErrorCode.SOD_VIOLATION);
    }

    const approved = await request(app.getHttpServer())
      .post(`/reversals/${reversal.body.id}/approve`)
      .set('Authorization', bearer(supervisor))
      .send({ note: 'Agreed' })
      .expect(201);
    expect(approved.body.status).toBe(ReversalStatus.APPROVED);
    expect(approved.body.payment.status).toBe(PaymentStatus.REVERSED);

    const detail = await request(app.getHttpServer())
      .get(`/assessments/${assessment.id}`)
      .set('Authorization', bearer(officer))
      .expect(200);
    expect(detail.body.paidAmount).toBe('5725'); // 55715 + 10 − 50000
    expect(detail.body.status).toBe(AssessmentStatus.PART_PAID);

    const again = await request(app.getHttpServer())
      .post(`/reversals/${reversal.body.id}/approve`)
      .set('Authorization', bearer(supervisor))
      .send({})
      .expect(409);
    expect(again.body.code).toBe(ErrorCode.REVERSAL_ALREADY_DECIDED);
  });
});
