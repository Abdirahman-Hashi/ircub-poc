import { Test } from '@nestjs/testing';
import request from 'supertest';

import { API, type LoginResponse, type SessionResponse } from '@ircub/shared';

import { SEED_PASSWORD } from '../../prisma/seed/seed.constants';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';

import type { TestSession } from './test-app.types';
import type { INestApplication } from '@nestjs/common';

export type { TestSession } from './test-app.types';

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ bufferLogs: true, rawBody: true });
  configureApp(app);
  await app.init();
  return app;
}

/** Logs a seeded user in and returns the bearer token and raw refresh cookie. */
export async function loginAs(
  app: INestApplication,
  email: string,
  password = SEED_PASSWORD,
): Promise<TestSession> {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);
  const body = res.body as LoginResponse;
  if (body.accessToken === undefined || body.user === undefined) {
    throw new Error(`login for ${email} did not return a session: ${JSON.stringify(body)}`);
  }
  return {
    accessToken: body.accessToken,
    refreshCookie: extractRefreshCookie(res),
    userId: body.user.id,
  };
}

export function extractRefreshCookie(res: request.Response): string {
  const header = res.headers['set-cookie'] as string | string[] | undefined;
  const cookies: string[] = Array.isArray(header) ? header : header === undefined ? [] : [header];
  const refresh = cookies.find((cookie) => cookie.startsWith(`${API.REFRESH_COOKIE}=`));
  if (refresh === undefined) {
    throw new Error('no refresh cookie in response');
  }
  return refresh.split(';')[0] ?? '';
}

export function asSession(body: unknown): SessionResponse {
  return body as SessionResponse;
}

export const SEED = {
  ADMIN: 'admin@ircub.test',
  SUPERVISOR: 'supervisor@ircub.test',
  OFFICER: 'officer@ircub.test',
  WATER: 'water@ircub.test',
  AUDITOR: 'auditor@ircub.test',
  CUSTOMER: 'customer1@ircub.test',
  PASSWORD: SEED_PASSWORD,
} as const;
