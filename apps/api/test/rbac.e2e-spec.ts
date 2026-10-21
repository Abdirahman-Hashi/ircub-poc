import request from 'supertest';

import { ErrorCode, PERMISSIONS, ROLES } from '@ircub/shared';

import { createTestApp, loginAs, SEED, type TestSession } from './helpers/test-app';

import type { RoleLike } from './helpers/test-app.types';
import type { INestApplication } from '@nestjs/common';

describe('rbac + sod (e2e)', () => {
  let app: INestApplication;
  let admin: TestSession;
  let roleIdByCode: Map<string, string>;

  beforeAll(async () => {
    app = await createTestApp();
    admin = await loginAs(app, SEED.ADMIN);
    const roles = await request(app.getHttpServer())
      .get('/roles')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);
    roleIdByCode = new Map((roles.body as RoleLike[]).map((r) => [r.code, r.id]));
  });

  afterAll(async () => {
    await app.close();
  });

  const bearer = (s: TestSession): string => `Bearer ${s.accessToken}`;
  const roleId = (code: string): string => {
    const id = roleIdByCode.get(code);
    if (id === undefined) {
      throw new Error(`seeded role ${code} missing`);
    }
    return id;
  };

  it('distinguishes 401 (no token) from 403 (token without the permission)', async () => {
    const anonymous = await request(app.getHttpServer()).get('/users').expect(401);
    expect(anonymous.body.code).toBe(ErrorCode.UNAUTHENTICATED);

    const officer = await loginAs(app, SEED.OFFICER);
    const forbidden = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', bearer(officer))
      .expect(403);
    expect(forbidden.body.code).toBe(ErrorCode.FORBIDDEN);
    expect(forbidden.body.details.missing).toEqual([PERMISSIONS.USERS_MANAGE]);
  });

  it('the auditor can read and verify the audit log; the officer cannot', async () => {
    const auditor = await loginAs(app, SEED.AUDITOR);
    const verify = await request(app.getHttpServer())
      .get('/audit/verify')
      .set('Authorization', bearer(auditor))
      .expect(200);
    expect(verify.body.ok).toBe(true);
    expect(verify.body.checked).toBeGreaterThan(0);

    const officer = await loginAs(app, SEED.OFFICER);
    await request(app.getHttpServer())
      .get('/audit')
      .set('Authorization', bearer(officer))
      .expect(403);
  });

  it('a custom role created by the admin grants its permission on the very next request', async () => {
    const suffix = Date.now();
    const email = `custom-${suffix}@ircub.test`;
    const role = await request(app.getHttpServer())
      .post('/roles')
      .set('Authorization', bearer(admin))
      .send({ code: `CUSTOM_${suffix}`, name: 'Custom viewer' })
      .expect(201);

    const created = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', bearer(admin))
      .send({ email, fullName: 'Custom User', roleIds: [role.body.id] })
      .expect(201);
    const user = await loginAs(app, email, created.body.temporaryPassword);

    await request(app.getHttpServer()).get('/audit').set('Authorization', bearer(user)).expect(403);

    await request(app.getHttpServer())
      .put(`/roles/${role.body.id}/permissions`)
      .set('Authorization', bearer(admin))
      .send({ codes: [PERMISSIONS.AUDIT_VIEW] })
      .expect(200);

    await request(app.getHttpServer()).get('/audit').set('Authorization', bearer(user)).expect(200);

    // Audit trail recorded the user creation and the matrix change with the admin as actor.
    const audit = await request(app.getHttpServer())
      .get('/audit')
      .query({ entity: 'User', entityId: created.body.id })
      .set('Authorization', bearer(admin))
      .expect(200);
    expect(audit.body.items[0]).toMatchObject({ action: 'CREATE', actorEmail: SEED.ADMIN });
    expect(audit.body.items[0].after.passwordHash).toBe('[REDACTED]');
  });

  it('rejects assigning the approver role to the capturer user with SOD_VIOLATION', async () => {
    const officer = await request(app.getHttpServer())
      .get('/users')
      .query({ search: SEED.OFFICER })
      .set('Authorization', bearer(admin))
      .expect(200);
    const officerId = officer.body.items[0].id as string;

    const res = await request(app.getHttpServer())
      .put(`/users/${officerId}/roles`)
      .set('Authorization', bearer(admin))
      .send({ roleIds: [roleId(ROLES.REVENUE_OFFICER), roleId(ROLES.REVENUE_SUPERVISOR)] })
      .expect(403);
    expect(res.body.code).toBe(ErrorCode.SOD_VIOLATION);
    expect(res.body.details.conflicts[0]).toMatchObject({
      userId: officerId,
      permissionACode: PERMISSIONS.REVERSALS_APPROVE,
      permissionBCode: PERMISSIONS.REVERSALS_CAPTURE,
    });

    // Nothing was written: the officer still has exactly one role.
    const after = await request(app.getHttpServer())
      .get(`/users/${officerId}`)
      .set('Authorization', bearer(admin))
      .expect(200);
    expect((after.body as { roles: RoleLike[] }).roles.map((r) => r.code)).toEqual([
      ROLES.REVENUE_OFFICER,
    ]);
  });

  it('rejects granting the capture permission to the approver role (second enforcement path)', async () => {
    const supervisorRoleId = roleId(ROLES.REVENUE_SUPERVISOR);
    const current = await request(app.getHttpServer())
      .get(`/roles/${supervisorRoleId}`)
      .set('Authorization', bearer(admin))
      .expect(200);

    const res = await request(app.getHttpServer())
      .put(`/roles/${supervisorRoleId}/permissions`)
      .set('Authorization', bearer(admin))
      .send({ codes: [...current.body.permissionCodes, PERMISSIONS.REVERSALS_CAPTURE] })
      .expect(403);
    expect(res.body.code).toBe(ErrorCode.SOD_VIOLATION);
  });

  it('rejects re-parenting a role so that holders would inherit a conflicting permission', async () => {
    const supervisorRoleId = roleId(ROLES.REVENUE_SUPERVISOR);
    const res = await request(app.getHttpServer())
      .patch(`/roles/${supervisorRoleId}`)
      .set('Authorization', bearer(admin))
      .send({ parentId: roleId(ROLES.REVENUE_OFFICER) })
      .expect(403);
    expect(res.body.code).toBe(ErrorCode.SOD_VIOLATION);
  });

  it('refuses to delete a built-in role and refuses a role cycle', async () => {
    const officerRoleId = roleId(ROLES.REVENUE_OFFICER);
    const del = await request(app.getHttpServer())
      .delete(`/roles/${officerRoleId}`)
      .set('Authorization', bearer(admin))
      .expect(403);
    expect(del.body.code).toBe(ErrorCode.SYSTEM_ROLE_IMMUTABLE);

    const cycle = await request(app.getHttpServer())
      .patch(`/roles/${officerRoleId}`)
      .set('Authorization', bearer(admin))
      .send({ parentId: roleId(ROLES.WATER_BILLING_OFFICER) })
      .expect(400);
    expect(cycle.body.code).toBe(ErrorCode.VALIDATION_FAILED);
  });

  it('a deactivated user cannot log in and their sessions are revoked', async () => {
    const suffix = Date.now();
    const created = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', bearer(admin))
      .send({ email: `deact-${suffix}@ircub.test`, fullName: 'To Deactivate', roleIds: [] })
      .expect(201);
    const session = await loginAs(app, created.body.email, created.body.temporaryPassword);

    await request(app.getHttpServer())
      .post(`/users/${created.body.id}/deactivate`)
      .set('Authorization', bearer(admin))
      .expect(201);

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', bearer(session))
      .expect(401);
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', session.refreshCookie)
      .expect(401);
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: created.body.email, password: created.body.temporaryPassword })
      .expect(401);
    expect(login.body.code).toBe(ErrorCode.INVALID_CREDENTIALS);
  });
});
