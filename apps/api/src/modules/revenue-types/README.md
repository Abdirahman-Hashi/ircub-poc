# revenue-types

**Purpose.** Catalogue of revenue streams: how the amount is computed (FIXED amount or PERCENT
of a base) and the GL code collections post to (brief Module 3, phase 5 FMIS).

**Rules.**

- `code` is unique and immutable; rate changes affect new assessments only (existing
  assessments keep the amount computed at creation).
- Delete is refused once anything references the type (assessments, GL mappings, journal
  lines, summaries, targets); it is deactivated instead and disappears from the
  create-assessment picker.

**Endpoints.** `GET /revenue-types?includeInactive`, `GET /revenue-types/:id`
(`assessments.view`); `POST`, `PATCH /:id`, `DELETE /:id` (`revenue_types.manage`).

**Testing.** Unit: amount computation in `assessments.rules.spec.ts`. E2E: seeded types used
across `test/registry.e2e-spec.ts`.
