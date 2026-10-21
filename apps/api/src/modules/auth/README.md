# auth

**Purpose.** Login/logout, refresh-token rotation, optional TOTP 2FA and password policy
(brief Module 1 output "secure login/logout with password policy and optional 2FA", D5).

**Rules.**

- Access token: 15-min JWT (`purpose: access`). Refresh: opaque, stored hashed, httpOnly
  cookie scoped to `/auth`, rotated on every use; presenting a revoked token revokes all of
  the user's sessions (reuse detection).
- Password policy from SystemConfig: `PASSWORD_MIN_LENGTH`, upper/lower/digit/symbol, not
  one of the last `PASSWORD_HISTORY_SIZE`, `PASSWORD_MAX_AGE_DAYS` warn-only.
  Lockout after `LOGIN_MAX_FAILED_ATTEMPTS` for `LOGIN_LOCKOUT_MINUTES`.
- MFA: enrol stores a secret but only `confirm` with a valid code enables it; login then
  returns `{ mfaRequired, challengeToken }` (5-min JWT with `purpose: mfa`) for `mfa/verify`.
- Wrong email and wrong password return the same `INVALID_CREDENTIALS`.
- Credential endpoints are throttled more tightly than the global limit.

**Endpoints.** `POST /auth/login`, `POST /auth/mfa/verify`, `POST /auth/refresh`,
`POST /auth/logout` (public); `GET /auth/me`, `POST /auth/mfa/enrol|confirm|disable`,
`POST /auth/change-password` (authenticated, no permission needed).

**Testing.** Unit: `password.rules.spec.ts` (each policy rule, lockout, staleness,
temporary passwords). E2E: `test/auth.e2e-spec.ts` (login, refresh rotation, reuse
detection, logout, lockout, change-password policy).
