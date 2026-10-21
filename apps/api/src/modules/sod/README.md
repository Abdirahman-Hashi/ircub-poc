# sod

**Purpose.** Configurable segregation-of-duties rules and their enforcement (brief Module 1
"enforce segregation of duties", D7). The per-record rule (`capturedById !== approverId`)
lives in the reversals module (phase 2); this module owns the role-level rule.

**Rules.**

- A rule is a pair of permission codes no single user may hold together, through any
  combination of roles (inheritance included). Pairs are stored in sorted order.
- `assertNoConflict(userIds, overrides)` evaluates the _proposed_ state in memory and throws
  `SOD_VIOLATION` (403) with the conflicting users and rules; nothing is written on rejection.
  Called from user role assignment, role permission changes and role re-parenting.
- Creating a rule that existing users already violate is rejected (409 `SOD_VIOLATION`).
- There is no superuser bypass: administrators are subject to the same rules.

**Endpoints** (all `roles.manage`): `GET /sod-rules`, `POST /sod-rules`, `DELETE /sod-rules/:id`.

**Testing.** Unit: `sod.rules.spec.ts`. E2E: `test/rbac.e2e-spec.ts` (assigning the approver
role to the capturer → `SOD_VIOLATION`; granting the capture permission to the approver role →
`SOD_VIOLATION`).
