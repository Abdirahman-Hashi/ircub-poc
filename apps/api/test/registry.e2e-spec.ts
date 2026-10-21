import request from 'supertest';

import {
  AssessmentStatus,
  DuplicateFlagStatus,
  DuplicateMatchField,
  ErrorCode,
} from '@ircub/shared';

import { isValidControlNumber, isValidTin } from '../src/common/ids/ids.rules';

import { createAssessment, registerPayer, revenueTypeByCode } from './helpers/registry';
import { createTestApp, loginAs, SEED, type TestSession } from './helpers/test-app';

import type { INestApplication } from '@nestjs/common';

describe('registry (e2e)', () => {
  let app: INestApplication;
  let officer: TestSession;
  let supervisor: TestSession;

  beforeAll(async () => {
    app = await createTestApp();
    officer = await loginAs(app, SEED.OFFICER);
    supervisor = await loginAs(app, SEED.SUPERVISOR);
  });

  afterAll(async () => {
    await app.close();
  });

  const bearer = (s: TestSession): string => `Bearer ${s.accessToken}`;

  it('registers a payer with a valid generated TIN and normalised phone', async () => {
    // Local format with spaces; unique per run so re-runs on the same database never collide.
    const local = `06${String(Date.now()).slice(-8)}`;
    const payer = await registerPayer(app, officer, {
      phone: `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`,
    });
    expect(isValidTin(payer.tin)).toBe(true);
    expect(payer.phone).toBe(`+252${local.slice(1)}`);
    expect(payer.warnings).toEqual([]);
  });

  it('flags a duplicate by phone on registration and lets a supervisor review it', async () => {
    const original = await registerPayer(app, officer);
    const duplicate = await registerPayer(app, officer, { phone: original.phone });

    expect(duplicate.warnings).toHaveLength(1);
    expect(duplicate.warnings[0]).toMatchObject({
      matchField: DuplicateMatchField.PHONE,
      status: DuplicateFlagStatus.PENDING,
      matchedPayer: { id: original.id },
    });

    const queue = await request(app.getHttpServer())
      .get('/payers/duplicates')
      .set('Authorization', bearer(supervisor))
      .expect(200);
    const flag = (queue.body.items as { id: string; payer: { id: string } }[]).find(
      (f) => f.payer.id === duplicate.id,
    );
    expect(flag).toBeDefined();

    // Officers lack payers.review_duplicates.
    await request(app.getHttpServer())
      .post(`/payers/duplicates/${flag?.id}/review`)
      .set('Authorization', bearer(officer))
      .send({ status: DuplicateFlagStatus.CONFIRMED })
      .expect(403);

    const reviewed = await request(app.getHttpServer())
      .post(`/payers/duplicates/${flag?.id}/review`)
      .set('Authorization', bearer(supervisor))
      .send({ status: DuplicateFlagStatus.CONFIRMED, note: 'Same person' })
      .expect(201);
    expect(reviewed.body.status).toBe(DuplicateFlagStatus.CONFIRMED);
  });

  it('rejects an unparseable phone number', async () => {
    const res = await request(app.getHttpServer())
      .post('/payers')
      .set('Authorization', bearer(officer))
      .send({ type: 'INDIVIDUAL', name: 'Bad Phone', phone: '12' })
      .expect(400);
    expect(res.body.code).toBe(ErrorCode.VALIDATION_FAILED);
  });

  it('creates an assessment with a valid control number and the FIXED amount', async () => {
    const payer = await registerPayer(app, officer);
    const licence = await revenueTypeByCode(app, officer, 'BUSINESS_LICENCE');
    const assessment = await createAssessment(app, officer, payer.id, licence.id, {
      period: '2026',
    });

    expect(isValidControlNumber(assessment.controlNumber)).toBe(true);
    expect(assessment.amount).toBe(licence.rate);
    expect(assessment.status).toBe(AssessmentStatus.PENDING);
    expect(assessment.outstanding).toBe(licence.rate);
  });

  it('computes PERCENT amounts from the base and requires a base', async () => {
    const payer = await registerPayer(app, officer);
    const property = await revenueTypeByCode(app, officer, 'PROPERTY_RATE');
    const assessment = await createAssessment(app, officer, payer.id, property.id, {
      baseAmount: '2000000.00',
    });
    expect(assessment.amount).toBe('10000');

    const missing = await request(app.getHttpServer())
      .post('/assessments')
      .set('Authorization', bearer(officer))
      .send({ payerId: payer.id, revenueTypeId: property.id })
      .expect(400);
    expect(missing.body.code).toBe(ErrorCode.VALIDATION_FAILED);
  });

  it('filters assessments by TIN and exports the same set as CSV', async () => {
    const payer = await registerPayer(app, officer);
    const licence = await revenueTypeByCode(app, officer, 'BUSINESS_LICENCE');
    await createAssessment(app, officer, payer.id, licence.id);

    const list = await request(app.getHttpServer())
      .get('/assessments')
      .query({ tin: payer.tin })
      .set('Authorization', bearer(officer))
      .expect(200);
    expect(list.body.total).toBe(1);

    const csv = await request(app.getHttpServer())
      .get('/assessments/export.csv')
      .query({ tin: payer.tin })
      .set('Authorization', bearer(officer))
      .expect(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    const lines = csv.text.trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('control_number');
    expect(lines[1]).toContain(payer.tin);
  });

  it('shows the 360° profile with balances and lets the linked customer see their own', async () => {
    const payer = await registerPayer(app, officer);
    const licence = await revenueTypeByCode(app, officer, 'BUSINESS_LICENCE');
    await createAssessment(app, officer, payer.id, licence.id);

    const profile = await request(app.getHttpServer())
      .get(`/payers/${payer.id}`)
      .set('Authorization', bearer(officer))
      .expect(200);
    expect(profile.body.balances).toEqual({
      assessedTotal: '150000',
      paidTotal: '0',
      outstanding: '150000',
    });
    expect(profile.body.assessments).toHaveLength(1);

    const customer = await loginAs(app, SEED.CUSTOMER);
    const me = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', bearer(customer))
      .expect(200);
    expect(me.body.payer.id).toBeDefined();
    await request(app.getHttpServer())
      .get('/payers')
      .set('Authorization', bearer(customer))
      .expect(403);
  });

  it('suspends a payer and blocks new assessments until reactivated', async () => {
    const payer = await registerPayer(app, officer);
    const licence = await revenueTypeByCode(app, officer, 'BUSINESS_LICENCE');
    await request(app.getHttpServer())
      .post(`/payers/${payer.id}/suspend`)
      .set('Authorization', bearer(officer))
      .expect(201);
    const blocked = await request(app.getHttpServer())
      .post('/assessments')
      .set('Authorization', bearer(officer))
      .send({ payerId: payer.id, revenueTypeId: licence.id })
      .expect(409);
    expect(blocked.body.code).toBe(ErrorCode.PAYER_SUSPENDED);
    await request(app.getHttpServer())
      .post(`/payers/${payer.id}/reactivate`)
      .set('Authorization', bearer(officer))
      .expect(201);
    await createAssessment(app, officer, payer.id, licence.id);
  });
});
