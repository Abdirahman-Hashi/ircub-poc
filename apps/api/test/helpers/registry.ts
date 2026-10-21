import request from 'supertest';

import {
  type AssessmentView,
  PayerType,
  type RegisteredPayer,
  type RevenueTypeView,
} from '@ircub/shared';

import type { TestSession } from './test-app.types';
import type { INestApplication } from '@nestjs/common';

let counter = 0;

/** Registers a payer with a unique phone/email; returns the API's response body. */
export async function registerPayer(
  app: INestApplication,
  session: TestSession,
  overrides: Record<string, unknown> = {},
): Promise<RegisteredPayer> {
  counter += 1;
  const stamp = `${Date.now()}${counter}`;
  const res = await request(app.getHttpServer())
    .post('/payers')
    .set('Authorization', `Bearer ${session.accessToken}`)
    .send({
      type: PayerType.INDIVIDUAL,
      name: `E2E Payer ${stamp}`,
      phone: `+2526${stamp.slice(-8)}`,
      email: `payer-${stamp}@ircub.test`,
      ...overrides,
    })
    .expect(201);
  return res.body as RegisteredPayer;
}

export async function revenueTypeByCode(
  app: INestApplication,
  session: TestSession,
  code: string,
): Promise<RevenueTypeView> {
  const res = await request(app.getHttpServer())
    .get('/revenue-types')
    .set('Authorization', `Bearer ${session.accessToken}`)
    .expect(200);
  const found = (res.body as RevenueTypeView[]).find((type) => type.code === code);
  if (found === undefined) {
    throw new Error(`seeded revenue type ${code} missing`);
  }
  return found;
}

export async function createAssessment(
  app: INestApplication,
  session: TestSession,
  payerId: string,
  revenueTypeId: string,
  extra: Record<string, unknown> = {},
): Promise<AssessmentView> {
  const res = await request(app.getHttpServer())
    .post('/assessments')
    .set('Authorization', `Bearer ${session.accessToken}`)
    .send({ payerId, revenueTypeId, ...extra })
    .expect(201);
  return res.body as AssessmentView;
}
