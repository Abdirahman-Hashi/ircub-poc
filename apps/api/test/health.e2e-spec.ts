import { Test } from '@nestjs/testing';
import request from 'supertest';

import { API, CHECK_STATUS, HEALTH_STATUS } from '@ircub/shared';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

import type { INestApplication } from '@nestjs/common';

describe('health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ bufferLogs: true });
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health reports the process is up and echoes a request id', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);

    expect(res.body).toMatchObject({ status: HEALTH_STATUS.OK, checks: {} });
    expect(typeof res.body.version).toBe('string');
    expect(res.headers[API.REQUEST_ID_HEADER]).toEqual(expect.any(String));
  });

  it('GET /health reuses the caller-supplied request id', async () => {
    const res = await request(app.getHttpServer())
      .get('/health')
      .set(API.REQUEST_ID_HEADER, 'e2e-request-1')
      .expect(200);

    expect(res.headers[API.REQUEST_ID_HEADER]).toBe('e2e-request-1');
  });

  it('GET /ready confirms database and job queue are up', async () => {
    const res = await request(app.getHttpServer()).get('/ready').expect(200);

    expect(res.body.status).toBe(HEALTH_STATUS.OK);
    expect(res.body.checks.db.status).toBe(CHECK_STATUS.UP);
    expect(res.body.checks.jobs.status).toBe(CHECK_STATUS.UP);
  });

  it('unknown routes return the error contract with a stable code', async () => {
    const res = await request(app.getHttpServer()).get('/does-not-exist').expect(404);

    expect(res.body).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
    expect(res.body.requestId).toEqual(expect.any(String));
  });
});
