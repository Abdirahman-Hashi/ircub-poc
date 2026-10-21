---
description: Phase 1 — auth, hierarchical RBAC, custom roles, segregation of duties, tamper-evident audit log, seed users
---

Read `CLAUDE.md`, `docs/DECISIONS.md` (D5–D8, D24) and `docs/PROGRESS.md`. This phase
implements brief **Module 1 (User & Role Management)** and the audit foundation that
**Module 3.4** requires. Everything later depends on this, so take care with the schema.

## Standards reminder (applies to every file in this phase)
`docs/ENGINEERING-STANDARDS.md` is enforced by lint and `/review`: every threshold, limit,
duration, code, prefix, job/event name, message and URL is a named constant, a
`SystemConfigKey` (for runtime-tunable business parameters — add key, typed default and
seed entry together), an env value, or a shared enum; every `interface`/`type`/`enum` is in
`*.types.ts`, `dto/*.dto.ts` or `packages/shared`; business rules are pure functions in
`*.rules.ts` with unit tests; external HTTP sits behind an injected interface; each new
module gets a `README.md`. Before committing, run `pnpm lint` and fix, do not disable rules.

## Prisma models to add
`User` (id uuid, email unique, passwordHash, fullName, status ACTIVE|DEACTIVATED, mfaEnabled,
mfaSecret?, passwordChangedAt, failedLoginCount, lockedUntil?, payerId? — FK added in phase 2,
createdAt, updatedAt), `PasswordHistory`, `RefreshToken` (tokenHash, userId, expiresAt,
revokedAt?), `Role` (id, code unique, name, description, parentId? self-relation, isSystem),
`Permission` (id, code unique, description, group), `RolePermission` (@@id([roleId,
permissionId])), `UserRole` (@@id([userId, roleId])), `SodRule` (id, permissionACode,
permissionBCode, description, @@unique([permissionACode, permissionBCode])), `AuditLog`
(per D8; `seq` bigint autoincrement, `hash` and `prevHash` char(64), indexes on entity+entityId,
actorId, createdAt), `SystemConfig` (key unique, value json, updatedById).

## Backend
1. **Auth module** (`common/auth` + `modules/auth`):
   - `POST /auth/login { email, password }` → if mfaEnabled: `{ mfaRequired: true,
     challengeToken }` else `{ accessToken, user, permissions[] }` + refresh cookie.
   - `POST /auth/mfa/verify { challengeToken, code }` → tokens.
   - `POST /auth/refresh` (cookie) → rotated tokens. `POST /auth/logout` → revoke.
   - `GET /auth/me` → user, roles, effective permissions.
   - `POST /auth/mfa/enrol` → `{ otpauthUrl, secret }`; `POST /auth/mfa/confirm { code }` →
     enables; `POST /auth/mfa/disable { password }`.
   - `POST /auth/change-password` enforcing the policy (D5) + history + lockout logic.
   - `JwtAuthGuard` global (APP_GUARD) with `@Public()` bypass; `PermissionsGuard` global
     reading `@RequirePermission(...codes)` (all must be present); effective permissions
     resolved via `PermissionsService.getEffectivePermissions(userId)` walking role parents
     (cycle-safe), cached per request.
2. **Users/Roles/Permissions/SoD modules** (admin APIs, all behind `users.manage` /
   `roles.manage`):
   - Users CRUD (create with temp password, edit, deactivate/reactivate, assign roles).
     Deactivated users cannot log in; their refresh tokens are revoked.
   - Roles CRUD incl. custom roles with `parentId`; `isSystem` roles cannot be deleted
     but can have permissions edited; `PUT /roles/:id/permissions { codes[] }`.
   - `GET /permissions` grouped for the matrix UI.
   - SoD rules CRUD; **enforcement**: assigning a role to a user, or a permission to a
     role, is rejected with `SOD_VIOLATION` if the resulting effective permission set of
     any affected user contains both sides of any rule. Write this check once in
     `SodService.assertNoConflict(userIds)` and call it from both paths.
   - `SystemConfig` get/set behind `config.manage` (store e.g. `localCurrency`, password
     policy numbers, `abnormalConsumptionThresholdPct`, `callbackSecret` NOT here).
3. **Audit** (`common/audit`): Prisma client extension (`$extends({ query: { $allModels:
   { create/update/delete/upsert/updateMany… } } })`) that, for models listed in
   `audit.config.ts`, loads `before` (for update/delete), performs the op, and inserts an
   `AuditLog` row with `after`, actor from a request-scoped `AsyncLocalStorage` context
   (userId, email, ip, userAgent; `SYSTEM` for jobs). Hash chain: serialise with a stable
   key order, `hash = sha256(prevHash + json)`, where `prevHash` is the latest row's hash;
   do it inside the same transaction with `SELECT … FOR UPDATE` on a single-row
   `AuditChainHead` table (or advisory lock) so concurrent writes stay ordered.
   `GET /audit?entity&entityId&actorId&from&to&page` (`audit.view`), `GET /audit/verify`
   recomputes the chain and returns `{ ok, checked, firstBrokenSeq? }`. Migration SQL
   adds a comment and (documented, not enforced in Compose) the INSERT/SELECT-only grant.
4. **Seed** (`prisma/seed/`): permissions from shared, six system roles with the exact
   mapping in the brief, hierarchy `Revenue Supervisor → parent Revenue Officer`,
   `System Administrator` holds everything, the SoD rule `reversals.capture ⟂
   reversals.approve`, six users (passwords from `CLAUDE.md`), config defaults.

## Frontend
- Login page (email/password → MFA code step when required), session persistence (access
  token in memory + refresh cookie; `/auth/me` on load), logout, change-password page, MFA
  enrol page with QR (use `qrcode` lib to render the otpauth URL).
- `useCan`, nav filtered by permission, route guard redirecting unauthorised to `/403`.
- Admin: Users table (status, roles, deactivate, reset password), Roles page with
  **permission matrix** (checkbox grid by group; save; shows inherited permissions greyed),
  create custom role (name, parent), SoD rules page (create/delete), system config page.
- Landing dashboard placeholder per role (phase 6 replaces it).

## Tests (minimum)
Unit: password policy (each rule), lockout, effective permissions with 3-level hierarchy and
cycle guard, SoD conflict detection on both paths, hash chain compute + `verify` detecting a
tampered row. E2E: login/refresh/logout, 401 vs 403 on a protected route, admin can create
custom role and user gains the permission immediately, SoD rejection returns `SOD_VIOLATION`.

## Acceptance
Log in as each seeded user; nav differs per role; auditor sees audit log and verify button
returns ok; assigning the approver role to the capturer user is rejected. `pnpm test` green.

Commits: `feat(api): prisma models for users, roles, permissions, sod, audit` ·
`feat(api): auth with jwt, refresh rotation, password policy, totp mfa` ·
`feat(api): rbac with hierarchical roles and permissions guard` · `feat(api): segregation of duties rules` ·
`feat(api): tamper-evident audit log via prisma extension` · `feat(api): seed roles, permissions, users` ·
`feat(web): auth flow, permission-aware shell, admin screens` · `test(api): auth, rbac, sod, audit` · `docs: phase 1 progress`
