import request from 'supertest';

import { API, ErrorCode } from '@ircub/shared';

import { asSession, createTestApp, extractRefreshCookie, loginAs, SEED } from './helpers/test-app';

import type { INestApplication } from '@nestjs/common';

describe('auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs a seeded user in, returns permissions and sets an httpOnly refresh cookie', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: SEED.OFFICER, password: SEED.PASSWORD })
      .expect(200);

    expect(res.body.mfaRequired).toBe(false);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.permissions).toContain('payments.capture');
    expect(res.body.permissions).not.toContain('reversals.approve');
    const cookie = res.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toContain(`${API.REFRESH_COOKIE}=`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/auth');
  });

  it('returns the same INVALID_CREDENTIALS for a wrong password and an unknown email', async () => {
    const wrong = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: SEED.OFFICER, password: 'nope-Nope-1!' })
      .expect(401);
    const unknown = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ghost@ircub.test', password: 'nope-Nope-1!' })
      .expect(401);
    expect(wrong.body.code).toBe(ErrorCode.INVALID_CREDENTIALS);
    expect(unknown.body.code).toBe(ErrorCode.INVALID_CREDENTIALS);
  });

  it('GET /auth/me returns the user, roles and effective permissions', async () => {
    const session = await loginAs(app, SEED.WATER);
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);

    expect(res.body.user.email).toBe(SEED.WATER);
    expect((res.body as { roles: { code: string }[] }).roles.map((r) => r.code)).toEqual([
      'WATER_BILLING_OFFICER',
    ]);
    // Inherited from Revenue Officer through the hierarchy.
    expect(res.body.permissions).toContain('payments.capture');
    expect(res.body.permissions).toContain('billing.run');
  });

  it('rotates the refresh token and detects reuse of the old one', async () => {
    const session = await loginAs(app, SEED.AUDITOR);

    const first = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', session.refreshCookie)
      .expect(200);
    expect(asSession(first.body).accessToken).toEqual(expect.any(String));
    const rotated = extractRefreshCookie(first);
    expect(rotated).not.toBe(session.refreshCookie);

    // Old cookie again → reuse detected → all sessions revoked.
    const reuse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', session.refreshCookie)
      .expect(401);
    expect(reuse.body.code).toBe(ErrorCode.REFRESH_TOKEN_REUSED);

    const afterRevocation = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', rotated)
      .expect(401);
    expect(afterRevocation.body.code).toBe(ErrorCode.REFRESH_TOKEN_INVALID);
  });

  it('logout revokes the refresh token', async () => {
    const session = await loginAs(app, SEED.AUDITOR);
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', session.refreshCookie)
      .expect(204);
    const res = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', session.refreshCookie)
      .expect(401);
    expect(res.body.code).toBe(ErrorCode.REFRESH_TOKEN_INVALID);
  });

  it('rejects a request without a token with 401 UNAUTHENTICATED', async () => {
    const res = await request(app.getHttpServer()).get('/auth/me').expect(401);
    expect(res.body.code).toBe(ErrorCode.UNAUTHENTICATED);
  });

  it('enforces the password policy and history on change-password', async () => {
    // A fresh user so repeated runs never pollute a seeded account's password history.
    const admin = await loginAs(app, SEED.ADMIN);
    const created = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: `pw-${Date.now()}@ircub.test`, fullName: 'Password Tester', roleIds: [] })
      .expect(201);
    const temporaryPassword = created.body.temporaryPassword as string;
    const session = await loginAs(app, created.body.email as string, temporaryPassword);
    const change = (currentPassword: string, newPassword: string, token = session.accessToken) =>
      request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword, newPassword });

    const weak = await change(temporaryPassword, 'short').expect(422);
    expect(weak.body.code).toBe(ErrorCode.PASSWORD_POLICY_VIOLATION);
    expect(weak.body.details.violations).toEqual(
      expect.arrayContaining(['TOO_SHORT', 'NO_UPPERCASE']),
    );

    const wrongCurrent = await change('not-the-Password-1!', 'Changed-Passw0rd!').expect(401);
    expect(wrongCurrent.body.code).toBe(ErrorCode.INVALID_CREDENTIALS);

    const reused = await change(temporaryPassword, temporaryPassword).expect(422);
    expect(reused.body.code).toBe(ErrorCode.PASSWORD_REUSED);

    const strong = 'Changed-Passw0rd!';
    await change(temporaryPassword, strong).expect(204);
    const relogged = await loginAs(app, created.body.email as string, strong);

    // Going back to the temporary password is still blocked by the history window.
    const back = await change(strong, temporaryPassword, relogged.accessToken).expect(422);
    expect(back.body.code).toBe(ErrorCode.PASSWORD_REUSED);
  });

  it('locks the account after the configured number of failed logins', async () => {
    const admin = await loginAs(app, SEED.ADMIN);
    const created = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: `lock-${Date.now()}@ircub.test`, fullName: 'Lockout Tester', roleIds: [] })
      .expect(201);
    const email = created.body.email as string;
    const attempts = 5; // LOGIN_MAX_FAILED_ATTEMPTS default
    for (let i = 0; i < attempts; i += 1) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'Wrong-Passw0rd!' })
        .expect(401);
    }
    const locked = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: created.body.temporaryPassword as string })
      .expect(423);
    expect(locked.body.code).toBe(ErrorCode.ACCOUNT_LOCKED);
  });
});
