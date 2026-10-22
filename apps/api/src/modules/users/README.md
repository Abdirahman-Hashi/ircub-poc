# users

**Purpose.** Administrator CRUD over user accounts and their roles (brief Module 1).

**Rules.**

- Create and reset issue a policy-compliant temporary password, returned exactly once.
- Role assignment is a full replacement and goes through `SodService.assertNoConflict`
  _before_ any write and under the user's row lock, so a conflicting set is rejected with
  `SOD_VIOLATION`, nothing (including audit rows) is persisted, and two concurrent
  assignments cannot both pass the check against the same stale state.
- Deactivation revokes every refresh token; a deactivated user cannot log in or refresh.
  Administrators cannot deactivate themselves.
- Every mutation is audited with `passwordHash`/`mfaSecret` redacted.

**Endpoints** (all `users.manage`): `GET /users`, `GET /users/:id`, `POST /users`,
`PATCH /users/:id`, `PUT /users/:id/roles`, `POST /users/:id/deactivate|reactivate|reset-password`.

**Testing.** E2E: `test/rbac.e2e-spec.ts` (create user, roles take effect immediately,
SoD rejection), `test/auth.e2e-spec.ts` (deactivated user cannot log in).
