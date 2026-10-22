# Architecture Decision Log — IRCUB POC

Decided 2026-10-21. These are final for the POC. Each entry: decision → rationale → consequence.

## D1. Stack
- **Backend:** NestJS (TypeScript, strict) + Prisma + PostgreSQL 16.
- **Frontend:** Vite + React 18 + TypeScript SPA. Mantine (core, hooks, form, notifications,
  dates, charts optional), mantine-react-table, TanStack Query + Router, react-hook-form + zod,
  Recharts.
- **Mocks:** separate NestJS app (`apps/mocks`) in its own container.
- **Shared:** `packages/shared` for enums, permission codes, API types.
- Rationale: one language end-to-end; Nest's modules/guards/decorators map directly onto
  RBAC and Swagger; the candidate is most fluent here and must explain every line.

## D2. Repo layout — pnpm monorepo
`apps/api`, `apps/web`, `apps/mocks`, `packages/shared`. Single repo for graders; shared
types prevent API/UI drift.

## D3. Background jobs — pg-boss + @nestjs/schedule
pg-boss gives retries with backoff, scheduled jobs and a job table in Postgres; no Redis to
host. Crons (`@Cron`) trigger daily FMIS batching, channel reconciliation, dashboard
aggregation and alert evaluation. Consequence: jobs only run while the API process is awake
(acceptable; documented).

## D4. Real-time — Server-Sent Events
`@Sse()` endpoints for payment status streams and dashboard alerts. One-directional is all
that's required; simpler than WebSockets; works through proxies and on Render.

## D5. Auth
Passport JWT access token (15 min, `Authorization: Bearer`) + opaque refresh token (7 days,
httpOnly cookie, rotated on use, stored hashed). Passwords hashed with argon2id.
Password policy: min 10 chars, upper + lower + digit + symbol, not equal to last 5
(`PasswordHistory`), max age 90 days (warn only), lockout 15 min after 5 failed attempts.
Optional TOTP 2FA (`otplib`): enrol → QR (otpauth URL) → verify → enabled; login returns
`mfaRequired` challenge token when enabled. Logout revokes refresh token.

## D6. Permissions model
Tables: `Role(id, code, name, parentId?, isSystem)`, `Permission(id, code, description, group)`,
`RolePermission`, `UserRole`. Hierarchy: a role inherits its parent's permissions (resolved at
runtime, cached per request). Effective permissions = union over all user roles. Guard:
`@RequirePermission('payments.capture')` → `PermissionsGuard`. Admin UI can create custom
roles and toggle permissions; changes take effect immediately (no restart). Permission codes
are `resource.action` strings defined once in `packages/shared`.

## D7. Segregation of duties
Hard rule in `ReversalService.approve`: `reversal.capturedById !== approverId` → 403
`SOD_VIOLATION`. Plus `SodRule(permissionA, permissionB, description)` — a user cannot hold
both permissions through any role combination; checked on role assignment and permission
grant. Seeded rule: `reversals.capture` ⟂ `reversals.approve`.

## D8. Audit log — tamper-evident
`AuditLog(id bigserial, seq, actorId?, actorEmail, entity, entityId, action, before jsonb,
after jsonb, ip?, userAgent?, createdAt, prevHash, hash)`. Written by a Prisma client
extension on create/update/delete of audited models (list in `audit.config.ts`). `hash =
sha256(prevHash || canonicalJson(row without hash))`; chain verified by
`GET /audit/verify` and a unit test. The app DB role gets INSERT + SELECT only on `audit_log`
(migration SQL); documented in README as the production hardening step. API never exposes
update/delete for audit rows.

## D9. Money and currency
Amounts `Decimal(18,2)`, FX rates `Decimal(18,6)`. `decimal.js` for arithmetic, rounding
HALF_EVEN at 2 dp at the end of a computation, never mid-way. Local currency **SOS**; USD
supported. Every `Payment` stores `amount`, `currency`, `fxRate`, `fxRateAt`, `localAmount`.
Assessments and bills are denominated in SOS; USD payments are converted at capture time
using the rate retrieved from the mock FX API.

## D10. Identifiers
- TIN: `TIN` + 9 digits + 1 check digit (mod-11), unique.
- Control number (assessment & bill): 12 digits, last 2 = mod-97 check; unique across
  assessments and bills (shared `ControlNumber` sequence table).
- Water account: `WA` + 8 digits. Meter serial: free text, unique.
- All generated server-side; validated on input (bulk upload rejects bad check digits).

## D11. Idempotency and uniqueness
- `JournalLine.paymentId` unique → a payment can be on exactly one journal line.
- `Payment(channel, channelTxnRef)` unique → duplicate callbacks are no-ops.
- `JournalBatch.id` is the idempotency key sent to mock FMIS; FMIS returns the same
  reference for a repeated batch.
- `Assessment.controlNumber`, `Payer.tin`, `Meter.serial`, `User.email` unique.

## D12. Bulk CSV pipeline (shared)
`apps/api/src/common/csv/` — streaming parse → per-row schema validation (zod) → per-row
business validation (callback) → all-or-nothing? **No:** valid rows are saved in one
transaction, invalid rows are rejected individually; summary `{ totalRows, accepted,
rejected: [{ row, field?, reason }], uploadId }`. Upload file + summary stored in
`BulkUpload` for the audit trail. Used by: revenue transactions (phase 2) and meter readings
(phase 3). Real-time validation = the UI previews validation of the first N rows before
confirming the import (same endpoint with `dryRun=true`).

## D13. Meter reading rules
Reject `reading < previous` unless `type ∈ {ROLLOVER, REPLACEMENT}`. Rollover consumption
= `(meter.maxDigits value − previous) + reading`. Replacement: new meter linked via
`Meter.replacesMeterId`; first reading on new meter has consumption = `reading −
newMeter.initialReading`. Abnormal flag: consumption > 200% of the mean of the previous 3
monthly consumptions (if fewer than 3 exist, compare to available; if none, no flag).

## D14. Billing cycle
`BillingCycle(period 'YYYY-MM', status DRAFT → REVIEW → RELEASED)`. Run: for each active
account with a reading in period → consumption → tiered charge (tiers from `TariffTier`
for the account's `TariffCategory`, inclusive-exclusive unit bands, rate per unit) +
fixed service charge → arrears = previous bill's outstanding → unallocated payments
applied → `Bill`. Flagged (abnormal) bills block release until a Water Billing Officer
clears or confirms the flag. Release generates PDFs and mock notifications. Exception
report = list of flagged + skipped accounts with reasons.

## D15. Payments flow
Initiate (`POST /payments`) → call mock channel → `INITIATED`/`PENDING` → mock posts a
signed callback (HMAC-SHA256 over body with shared secret) → verify signature + ref →
`CONFIRMED`/`FAILED` → apply to assessment/bill → emit SSE event. Status-check job
(pg-boss, `retryLimit: 3`, exponential backoff) polls `GET /channel/payments/:ref` for
payments still `PENDING` after 60 s; after the 3rd failure → `PERMANENTLY_FAILED` +
`Notification` to all users with `payments.supervise` permission + SSE alert.

## D16. Channel reconciliation
Daily job (and manual trigger) fetches the mock channel's statement CSV for a date,
matches on `channelTxnRef`, produces `ReconciliationRun` with lines categorised
`MATCHED | MISSING_IN_IRCUB | MISSING_IN_CHANNEL | AMOUNT_MISMATCH`. Screen + CSV export.

## D17. FMIS posting
`GlMapping(revenueTypeId, glCode, effectiveFrom)` (water revenue types included — water is a
revenue type with its own GL). Daily cron builds one `JournalBatch` per date from
`CONFIRMED` payments not yet on a line; lines grouped by GL code but each line references one
payment (traceability). Post via pg-boss job to mock FMIS; store `fmisReference`; statuses
`PENDING → POSTED | FAILED`; `REVERSED` when a reversal of a posted payment is approved
(creates a reversing batch). Reconciliation screen: IRCUB totals vs FMIS totals (mock FMIS
exposes `GET /fmis/ledger?date=`) per GL per day, drill-down to lines → payments.

## D18. Dashboard
`DailyCollectionSummary(date, revenueTypeId, channel, totalLocal, count)` maintained by a
job (recompute last 2 days hourly; full rebuild on demand). `RevenueTarget(period,
revenueTypeId, amount)`. Forecast: `simple-statistics` linear regression over the last 12
monthly totals, project next 3 months, return slope, intercept, R²; UI states the model and
R². Anomalies: evaluate every 5 min — collections today vs trailing-30-day mean (z-score <
−2 → alert), reversals today vs trailing-30-day mean (z > 2 → alert); `Alert` table + SSE
stream + bell icon. All dashboard endpoints are server-side aggregated; no raw rows sent.

## D19. PDF — pdfkit
Bill PDF: header, customer, account, meter, period, readings, consumption, tier breakdown,
arrears, payments, total due, control number, due date. Stored on disk under
`storage/bills/` (volume in Compose); served via authenticated endpoint.

## D20. Notifications — mocked
`apps/mocks` exposes `POST /sms`, `POST /email`, and `GET /outbox` (so the demo can show
sent messages). API stores `Notification` rows with status.

## D21. Testing
- api: Jest unit tests for every rule-bearing service (mock Prisma via `jest-mock-extended`);
  supertest e2e for auth, RBAC/SoD, bulk upload, payment callback + retry, FMIS idempotency,
  running against a disposable Postgres (`docker compose -f docker-compose.test.yml`).
- web: Vitest for permission-based nav filtering and the upload summary component.
- Target: every "trap" rule in the brief has a named test.

## D22. API docs
`@nestjs/swagger` with DTO decorators; `pnpm --filter api openapi:export` writes
`docs/openapi.json`; `openapi-to-postmanv2` generates `docs/postman/IRCUB.postman_collection.json`.
Swagger UI at `/docs` (unauthenticated in dev).

## D23. ERD
`prisma-erd-generator` (Mermaid) → `docs/erd.md` + `docs/erd.svg`.
_Phase 7:_ generated by `apps/api/scripts/erd.ts` (schema parser → Mermaid) instead, because
the generator would add puppeteer to every `prisma generate`; see PROGRESS.md phase 7.

## D24. Seed data
`prisma/seed.ts` with `@faker-js/faker` (fixed seed for reproducibility): 6 roles with
permissions, 6 users, 1 SoD rule, 6 revenue types with GL codes, 2 tariff categories with 4
tiers each, ~200 payers (some deliberate duplicates), ~120 water accounts/meters with 12
months of readings, ~1,500 assessments, ~1,200 payments across channels/currencies, bills for
the last 3 cycles, targets for 12 months, 1 posted and 1 failed journal batch.

## D25. Deployment
- `docker-compose.yml`: postgres, api, mocks, web (nginx serving the built SPA, proxying
  `/api` to api). `.env.example` committed.
- Hosted: Neon (Postgres, free, permanent), Render free web services (api, mocks, Docker),
  Render static site (web). `render.yaml` blueprint committed. README notes the ~1 min cold
  start and that crons run only while awake.

## D26. Git & AI declaration
Conventional Commits, one logical change per commit, phases visible in history. README
"AI assistance" section declares Claude Code usage and candidate review.

## Explicitly out of scope (state in README)
Real SMS/email/bank/FMIS integrations and formats; multi-state tenancy; i18n (English only);
mobile-first layouts; production secrets management; horizontal scaling.

## D27. Engineering standards are enforced, not advisory
`docs/ENGINEERING-STANDARDS.md` is binding. Mechanisms: ESLint (`no-magic-numbers`,
`consistent-type-definitions`, `no-restricted-syntax` for type declarations outside type
files, `no-explicit-any`, `import/no-cycle`), husky + lint-staged + commitlint, GitHub
Actions CI, and the `/review` standards audit. Runtime-tunable business parameters live in
`SystemConfig` (typed keys with defaults), deployment values in the zod-validated env
schema, fixed domain constants in `*.constants.ts` / `packages/shared`. Rationale: the
assessment is about seniority; "no hard-coded values" and "typed contracts in one place"
must be visible in the lint config and the file layout, not just claimed in the README.
