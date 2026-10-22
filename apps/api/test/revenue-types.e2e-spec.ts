import request from 'supertest';

import { RateType } from '@ircub/shared';

import { createAssessment, registerPayer, revenueTypeByCode } from './helpers/registry';
import { createTestApp, loginAs, SEED, type TestSession } from './helpers/test-app';

import type { INestApplication } from '@nestjs/common';

describe('revenue types (e2e)', () => {
  let app: INestApplication;
  let admin: TestSession;
  let officer: TestSession;
  const bearer = (s: TestSession): string => `Bearer ${s.accessToken}`;
  const stamp = Date.now();

  beforeAll(async () => {
    app = await createTestApp();
    admin = await loginAs(app, SEED.ADMIN);
    officer = await loginAs(app, SEED.OFFICER);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates, updates and lists a revenue type; officers cannot manage them', async () => {
    const created = await request(app.getHttpServer())
      .post('/revenue-types')
      .set('Authorization', bearer(admin))
      .send({
        code: `E2E_FEE_${stamp}`,
        name: 'E2E fee',
        rateType: RateType.FIXED,
        rate: '250.00',
        glCode: '4999',
      })
      .expect(201);
    expect(created.body).toMatchObject({ rate: '250', glCode: '4999', active: true });

    await request(app.getHttpServer())
      .post('/revenue-types')
      .set('Authorization', bearer(officer))
      .send({
        code: `E2E_X_${stamp}`,
        name: 'x',
        rateType: RateType.FIXED,
        rate: '1',
        glCode: '4998',
      })
      .expect(403);

    const updated = await request(app.getHttpServer())
      .patch(`/revenue-types/${created.body.id}`)
      .set('Authorization', bearer(admin))
      .send({ rate: '300.00' })
      .expect(200);
    expect(updated.body.rate).toBe('300');

    const listed = await request(app.getHttpServer())
      .get('/revenue-types')
      .set('Authorization', bearer(officer))
      .expect(200);
    expect((listed.body as { id: string }[]).some((t) => t.id === created.body.id)).toBe(true);

    // Unused: delete removes it outright.
    await request(app.getHttpServer())
      .delete(`/revenue-types/${created.body.id}`)
      .set('Authorization', bearer(admin))
      .expect(200);
    await request(app.getHttpServer())
      .get(`/revenue-types/${created.body.id}`)
      .set('Authorization', bearer(officer))
      .expect(404);
  });

  it('deactivates instead of deleting a type that assessments or GL mappings reference', async () => {
    const assessed = await request(app.getHttpServer())
      .post('/revenue-types')
      .set('Authorization', bearer(admin))
      .send({
        code: `E2E_USED_${stamp}`,
        name: 'E2E used',
        rateType: RateType.FIXED,
        rate: '100.00',
        glCode: '4997',
      })
      .expect(201);
    const payer = await registerPayer(app, officer);
    await createAssessment(app, officer, payer.id, assessed.body.id);
    const deactivated = await request(app.getHttpServer())
      .delete(`/revenue-types/${assessed.body.id}`)
      .set('Authorization', bearer(admin))
      .expect(200);
    expect(deactivated.body).toMatchObject({ id: assessed.body.id, active: false });

    // Referenced only by a GL mapping: still deactivated, never a foreign-key error.
    const mapped = await request(app.getHttpServer())
      .post('/revenue-types')
      .set('Authorization', bearer(admin))
      .send({
        code: `E2E_MAPPED_${stamp}`,
        name: 'E2E mapped',
        rateType: RateType.PERCENT,
        rate: '2.50',
        glCode: '4996',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/fmis/gl-mappings')
      .set('Authorization', bearer(admin))
      .send({
        revenueTypeId: mapped.body.id,
        glCode: '4996',
        glName: 'E2E mapped revenue',
        effectiveFrom: '2000-01-01',
      })
      .expect(201);
    const kept = await request(app.getHttpServer())
      .delete(`/revenue-types/${mapped.body.id}`)
      .set('Authorization', bearer(admin))
      .expect(200);
    expect(kept.body).toMatchObject({ id: mapped.body.id, active: false });

    const inactiveHidden = await request(app.getHttpServer())
      .get('/revenue-types')
      .set('Authorization', bearer(officer))
      .expect(200);
    expect((inactiveHidden.body as { id: string }[]).some((t) => t.id === mapped.body.id)).toBe(
      false,
    );
    const seeded = await revenueTypeByCode(app, officer, 'BUSINESS_LICENCE');
    expect(seeded.active).toBe(true);
  });
});
