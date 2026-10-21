# permissions

**Purpose.** The permission catalogue and the resolver behind every authorisation decision
(brief Module 1, D6).

**Rules.**

- Codes are seeded from `@ircub/shared` `PERMISSIONS`; business code never hard-codes a string.
- Effective permissions = union over held roles and their ancestors; cycle-safe.
  `resolveForUsers(userIds, overrides)` evaluates _proposed_ role/permission/parent changes in
  memory, which is how SoD rejects an assignment before anything is written.
- Results are cached per request (AsyncLocalStorage), so admin changes apply on the next request.

**Endpoints.** `GET /permissions` — `roles.manage` — grouped list for the matrix UI.

**Testing.** Unit: `permissions.rules.spec.ts` (three-level hierarchy, cycle guard, descendants,
overrides). E2E: `test/rbac.e2e-spec.ts` (401 vs 403, custom role grants immediately).
