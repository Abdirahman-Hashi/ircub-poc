# payers

**Purpose.** Taxpayer & customer registry with server-generated TINs, duplicate detection and
the 360° profile (brief Module 2, D10).

**Rules.**

- TIN = `TIN` + 9 random digits + mod-11 check digit, unique; never supplied by the client.
- Phone is normalised to E.164 (`PHONE_DEFAULT_COUNTRY_CODE` for local numbers), email
  lower-cased, national id upper-cased without spaces — then duplicate detection is an exact
  match on each field. Matches become `DuplicateFlag` rows (one per pair and field, either
  direction) returned as `warnings` on create/update; registration is never blocked.
- Suspended payers cannot receive assessments or payments (`PAYER_SUSPENDED`).

**Endpoints.** `GET /payers` (search, type, status), `GET /payers/:id` (profile),
`POST /payers`, `PATCH /payers/:id`, `POST /payers/:id/suspend|reactivate` —
`payers.view` / `payers.register`; `GET /payers/duplicates`,
`POST /payers/duplicates/:id/review` — `payers.review_duplicates`.

**Testing.** Unit: `payers.rules.spec.ts`. E2E: `test/registry.e2e-spec.ts` (registration → TIN
valid, duplicate flag created and reviewable).
