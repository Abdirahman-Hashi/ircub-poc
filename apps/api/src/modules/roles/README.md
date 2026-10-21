# roles

**Purpose.** Built-in and custom roles, the inheritance hierarchy and the permission matrix
(brief Module 1 "custom roles", D6).

**Rules.**

- A role inherits its parent's permissions recursively; re-parenting is rejected if it
  would create a cycle.
- Built-in roles (`isSystem`) can have permissions edited but cannot be deleted; custom
  roles cannot be deleted while users hold them or child roles exist.
- Changing a role's permissions or parent re-evaluates SoD for every user holding the role
  or any descendant role, _before_ the write.
- Changes apply on the next request — permissions are resolved per request, never cached
  across requests.

**Endpoints** (all `roles.manage`): `GET /roles`, `GET /roles/:id`, `POST /roles`,
`PATCH /roles/:id`, `PUT /roles/:id/permissions`, `DELETE /roles/:id`.

**Testing.** Unit: `permissions.rules.spec.ts` (hierarchy, cycles). E2E: `test/rbac.e2e-spec.ts`
(custom role → immediate access; permission update rejected by SoD).
