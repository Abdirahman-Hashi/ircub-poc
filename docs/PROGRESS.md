# Progress Log

Each phase appends a section: date/time, what was built, tests added (count), commits, open
items / deviations from the plan. Keep it factual and short — this is the hand-off between
Claude Code sessions and the basis for the README's "known limitations".

## Phase 0 — scaffold

**Date:** 2026-10-21

**Built**
- pnpm workspace (`apps/api`, `apps/web`, `apps/mocks`, `packages/shared`), strict base tsconfig,
  Prettier, `.editorconfig`, `.nvmrc`, fully commented `.env.example`.
- ESLint 9 flat config enforcing the engineering standards: typescript-eslint strict +
  stylistic (type-aware), `no-magic-numbers` (ignore 0/1/-1, enums, readonly class props, type
  indexes; off for specs, `*.constants.ts`, `*.keys.ts`, seed, test and config files),
  `consistent-type-definitions: interface`, `no-restricted-syntax` for type declarations outside
  type files, `import-x/no-cycle` + `import-x/order`, `react-hooks`. Verified: a magic number,
  an `interface` in a service and an `any` each fail lint; `wip` fails commitlint.
- husky (`pre-commit` → lint-staged, `commit-msg` → commitlint), GitHub Actions CI (lint,
  typecheck, unit, e2e against a `postgres:16` service, three Docker builds).
- `@ircub/shared`: permission codes + groups, six role codes, `ErrorCode` enum (seeded with
  every code named across the phase prompts), 23 domain enums, identifier/money/pagination/CSV/API
  constants, contract types (error body, health, pagination, SSE envelope).
- `apps/api`: zod env schema + typed `AppConfigService` (only `config/` touches `process.env`),
  `PrismaService`, `SystemConfigModule` (18 typed keys with defaults, 30 s cache, seed),
  `AppException` + `GlobalExceptionFilter` (`{ statusCode, code, message, details?, requestId }`),
  request-id middleware + AsyncLocalStorage context, nestjs-pino structured logs (JSON in
  production), `ValidationPipe` (whitelist, forbidNonWhitelisted, transform), helmet, cookie-parser,
  CORS, throttler, `@nestjs/schedule`, Swagger at `/docs` with bearer scheme, `GET /health` and
  `GET /ready`, pg-boss `JobsModule` with typed `enqueue`/`register`, `EventBus` + `GET /events`
  SSE with heartbeat, module README template, Prisma schema (enums, `SystemConfig`,
  `ControlNumber`) + `init` migration, deterministic idempotent seed skeleton, Jest unit + e2e
  configs, `openapi:export` (writes `docs/openapi.json`).
- `apps/mocks`: NestJS on :3100 with zod env, pino logs, Swagger, in-memory `StoreService`,
  `POST /__reset`, `GET /health`, `GET /rates` (±0.5 % drift, `?base=`, `?fail=1` → 503).
- `apps/web`: Vite + React 18 + Mantine 7 + mantine-react-table + TanStack Query/Router;
  `AppShell` with permission-filtered nav (`useCan` stub returns true), placeholder routes for
  every feature, `lib/api.ts` (bearer header, 401 → refresh → retry once, `ApiError` with
  `code`), "API is waking up…" overlay polling `/health`, `/login` placeholder, nginx config.
- Docker: multi-stage non-root Dockerfiles for api/mocks/web, `docker-compose.yml`
  (postgres with healthcheck + volume, api running `prisma migrate deploy`, mocks, nginx web on
  :8080 proxying `/api`), `docker-compose.test.yml` (tmpfs Postgres for e2e).
- README first version with AI-assistance declaration.

**Tests:** 13 (api unit 2, api e2e 4, mocks unit 4, web unit 3). Lint and typecheck clean.

**Verified manually:** `pnpm dev` → `/ready` reports `db: up, jobs: up`, `/docs` 200,
`/rates` drifts and rebases, `/__reset` clears, web serves the shell; `docker compose build`
produces the three images; `docker compose up` serves the SPA on :8080 and proxies `/api/health`.

**Deviations from the phase prompt (and why)**
- **Node 22, not 20.** Node 20 reached end-of-life in April 2026; 22 is the active LTS and what
  the Docker images use. `.nvmrc` = 22.
- **Library majors pinned to the versions the candidate knows and that fit together:** NestJS 11
  (prompt says 10+), Prisma 6 (7 changes config/driver model), TypeScript 5.9, ESLint 9, Vite 7,
  Vitest 3, Jest 30. React stays 18 and Mantine is 7 because `mantine-react-table` 2.0 (the only
  line that supports React 18 + Mantine 7+) targets Mantine 7.
- **`/health` vs `/ready`.** The prompt's acceptance says `/health` shows `db: up`; the standards
  (§4) and D27 require liveness and readiness to be separate, so the DB check is on `/ready`.
- **Shared package consumed as a built package by the Nest apps** (`main: dist`), with the
  source alias only in Vite/Vitest. A tsconfig `paths` alias to a sibling package breaks
  `rootDir`-based tsc builds; `pnpm install` builds shared automatically (`prepare`).
- **Lint exemptions beyond the prompt list:** `*.keys.ts` (the `SystemConfig` defaults map) and
  `job-payloads.ts` / `event-payloads.ts` (named by the standards themselves) may declare
  types; `test/**` and `*.config.ts` may use numeric literals.
- **`eslint-plugin-unicorn` not installed** (optional in the prompt): `filename-case` conflicts
  with PascalCase React component files mandated by `apps/web/CLAUDE.md`.
- **`openapi:export` runs from `dist`** (`nest build && node dist/openapi-export.js`): tsx uses
  esbuild, which does not emit decorator metadata, so Nest DI cannot resolve constructor
  parameters under tsx. The seed still runs under tsx (no DI).
- **Prisma CLI reads the root `.env` through `dotenv-cli`** (`pnpm --filter api prisma …`),
  because Prisma only looks for `.env` next to the schema or in the package directory.

**Packages not named in DECISIONS.md** (rule 11): `eslint-plugin-react-hooks` and
`eslint-import-resolver-typescript` (lint correctness), `dotenv-cli` + `dotenv` (root `.env`
for the Prisma CLI and the e2e runner), `pino`/`pino-http`/`pino-pretty` (peers of
`nestjs-pino`, which D27/standards allow), `swagger-ui-express` (peer of `@nestjs/swagger`),
`reflect-metadata`/`rxjs` (Nest peers), `@tabler/icons-react`/`clsx`/`dayjs` (peers of
`mantine-react-table`), `@hookform/resolvers` (react-hook-form + zod bridge), `jsdom` +
`@testing-library/jest-dom` (Vitest DOM environment).

**Open items / limitations**
- CI badge points at the GitHub repository (added after phase 1).
- Mocks app returns Nest's default validation error shape (no global filter); it is not part
  of the IRCUB API contract. Revisit in phase 4 if the API ever surfaces mock errors verbatim.
- pnpm 12 requires build-script approval (`allowBuilds` in `pnpm-workspace.yaml`); listed packages
  are Prisma, esbuild, the ESLint resolver and the Nest CLI file watcher.
- Compose host ports default to 5432/5433; this machine uses 5440/5441 via `.env`.

## Phase 1 — auth, RBAC, SoD, audit, seed

**Date:** 2026-10-21

**Built**
- **Schema** (`identity_access_audit`, `refresh_token_rotation` migrations): `User`,
  `PasswordHistory`, `RefreshToken` (hashed, `rotatedAt` vs `revokedAt`), `Role` (self-relation
  parent, `isSystem`), `Permission`, `RolePermission`, `UserRole`, `SodRule`, `AuditLog`
  (`seq` unique, `prevHash`/`hash` char(64), indexes on entity+entityId, actorId, createdAt),
  `AuditChainHead` (single locked row). Migration SQL adds the table comment, genesis head row,
  an append-only trigger on `audit_log`, and the documented least-privilege grant.
- **Audit** (`common/audit`): Prisma client extension over `$allModels` for
  create/update/delete/upsert/createMany/updateMany/deleteMany of models in `audit.config.ts`
  (User with `passwordHash`/`mfaSecret` redacted, Role, Permission, RolePermission, UserRole,
  SodRule, SystemConfig). `before` loaded for updates/deletes; actor (id, email, ip, user agent)
  from AsyncLocalStorage, `SYSTEM` for jobs and seed. Hash chain
  `sha256(prevHash || canonicalJson(row))` appended under `SELECT … FOR UPDATE` on the head
  row. `GET /audit` (filters, pagination) and `GET /audit/verify` (batched recomputation,
  first broken seq). `PrismaService` now *is* the extended client.
- **Auth** (`modules/auth`, `common/auth`): argon2id, JWT access (15 min, `purpose: access`),
  opaque refresh token in an httpOnly cookie scoped to `/auth`, rotated on use, reuse
  detection revokes all sessions; TOTP via otplib (enrol → QR URL → confirm → enabled; login
  returns `mfaRequired` + 5-min challenge JWT); password policy from SystemConfig
  (min length, classes, last-5 history, 90-day warn), lockout 5 attempts / 15 min; same
  `INVALID_CREDENTIALS` for unknown email and wrong password; stricter throttle on login.
  Global `JwtAuthGuard` (`@Public()` bypass) and `PermissionsGuard`
  (`@RequirePermission(...codes)`, all required, 403 with `missing`).
- **RBAC** (`modules/permissions`, `roles`, `users`): effective permissions = union over held
  roles and ancestors (cycle-safe pure function), cached per request; `GET /permissions`
  grouped; roles CRUD with parent, cycle check, `isSystem` immutable delete, in-use delete
  guard, `PUT /roles/:id/permissions`; users CRUD with temporary password (returned once),
  roles replacement, deactivate (revokes sessions), reactivate, reset password.
- **SoD** (`modules/sod`): rules CRUD (sorted pair, duplicate check, creation rejected when
  existing users already violate). `SodService.assertNoConflict(userIds, overrides)` evaluates
  the *proposed* state in memory and is called from all three change paths: user ← roles,
  role ← permissions, role ← parent. Nothing is written on rejection.
- **SystemConfig admin API**: `GET /config`, `PUT /config/:key` (type-checked, audited).
- **Seed**: 32 permissions with descriptions, six system roles (hierarchy Water Billing Officer
  → Revenue Officer), six users (`Passw0rd!2026`), SoD rule capture ⟂ approve, config
  defaults. Runs through the audit extension (actor SYSTEM).
- **Web**: real `AuthProvider` (silent refresh on load, in-memory access token, MFA step,
  logout), `RequireAuth` layout guard, per-route `RequirePermission` → `/403`, login page,
  landing page per role, change-password and MFA enrol/disable pages (QR via `qrcode`),
  account menu, admin area with tabs: users table (server-side pagination, search, status,
  create/edit roles/deactivate/reset with one-time password modal), roles page with
  permission matrix (inherited greyed, dirty tracking, custom role with parent, delete),
  SoD rules page, system config page. `DataTable` wrapper over mantine-react-table.

**Tests:** 69 total — api unit 42 (password policy per rule, lockout, staleness, temporary
password, hierarchy 3 levels + cycle + descendants + overrides, SoD conflicts, canonical JSON,
hash chain tamper/deletion/forgery detection, pagination), api e2e 20 (login, 401 vs 403,
refresh rotation + reuse detection, logout, policy + history, lockout, custom role grants
immediately with audit trail, SoD on both paths + re-parenting, system role immutable, cycle,
deactivation), mocks unit 4, web unit 7 (nav filtering, nav active section, matrix rules).
Lint and typecheck clean.

**Verified manually (API):** each seeded user logs in with a different permission set (admin 31,
supervisor 19, water 14 incl. inherited officer permissions, officer 11, auditor 11, customer 2);
assigning Revenue Supervisor to officer@ → `403 SOD_VIOLATION`; auditor's `GET /audit/verify` →
`{ ok: true, checked: 152 }`; OpenAPI export has 28 paths.

**Verified manually (UI, headless Chromium walkthrough):** login error message, admin home
with role badge, nav per role (admin 9 items, officer 4, customer 1), users table and create
user with one-time password modal, permission matrix with 11 inherited (checked, disabled)
permissions on Water Billing Officer, saving `reversals.capture` on Revenue Supervisor shows
the `SOD_VIOLATION` toast, SoD rules and config pages, MFA enrolment renders the QR code,
change-password page, logout, officer at `/admin/users` → `/403`, session survives a hard
reload. No page errors or 5xx responses. Finding fixed on the spot: the per-IP throttle on
`/auth/refresh` (30/min) tripped after a handful of hard reloads; raised to 120/min and login to
20/min because limits are per source address and offices share one behind NAT.

**Deviations and decisions (why)**
- **Role/permission mapping.** The phase prompt's three statements (Supervisor inherits Officer,
  the seeded rule `reversals.capture ⟂ reversals.approve`, "Administrator holds everything")
  cannot all hold: any role chain that unions capture and approve violates the rule. Kept the
  decision-log rule (D7) and changed the seed: Officer captures reversals, Supervisor approves
  and does **not** inherit Officer; the demonstrated hierarchy is Water Billing Officer →
  Revenue Officer; Administrator holds everything except `reversals.capture`. No superuser
  bypass of SoD. Recorded in `docs/ASSUMPTIONS.md`.
- **Audit write is not atomic with the mutation.** Prisma query extensions cannot reach the
  caller's interactive transaction, so the audit row is appended in its own short transaction
  right after the mutation. A rolled-back outer transaction can leave audit rows behind.
  Documented in the module README; a transactional outbox would fix it in production.
- **Shared enums are `as const` objects + union types, not TS `enum`s**, so Prisma's generated
  string-literal unions are assignable both ways without casts.
- **otplib 12 instead of 13.** v13 depends on an ESM-only package that Jest's CommonJS runtime
  cannot load; v12 is the long-standing CommonJS release with the same TOTP semantics.
- **Rate limiting is skipped when `NODE_ENV=test`** (the e2e suite logs in far more than
  10 times a minute). Throttling itself is therefore not covered by e2e.
- **Refresh token reuse detection distinguishes rotation from revocation** (`rotatedAt`):
  replaying a rotated token revokes every session; a token revoked by logout is simply invalid.

**Packages added** (rule 11): `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`
(D5 Passport JWT), `argon2`, `otplib@12` (D5), `jest-mock-extended` (D21, unused yet),
`qrcode` + types (web, phase prompt).

**Open items / limitations**
- Audit `createMany` rows cannot carry database-generated ids (entityId falls back to the
  data supplied); audited models are created one by one or via upsert, so this path is
  only used for composite-key join rows where the id *is* the data.
- No "must change password at first login" flag; temporary passwords are policy-compliant
  and the 90-day rule is warn-only (D5).
- Web screens for the audit log and the `/me` customer portal are placeholders until their
  phases.

## Phase 2 — registry, revenue types, assessments, bulk upload

**Date:** 2026-10-21

**Built**
- **Schema** (`registry_revenue` migration): `Payer` (TIN unique, normalised phone/email,
  status), `DuplicateFlag` (unique per pair+field), `RevenueType` (FIXED/PERCENT, GL code),
  `Assessment` (control number unique, ledger `paidAmount`/`status`, indexes on every filter
  column), `Payment` (amount/currency/fxRate/fxRateAt/localAmount, `@@unique([channel,
  channelTxnRef])`, `bulkUploadId`), `Reversal`, `BulkUpload` (file path + JSON summary),
  `FxRate` history, `User.payerId` FK. New shared enums: `DuplicateMatchField`,
  `DuplicateFlagStatus`, `RateType`. All registered in `audit.config.ts`.
- **Identifiers** (`common/ids`, D10): TIN = `TIN` + 9 digits + mod-11 check (bodies whose check
  would be 10 are never issued); control number = 10-digit shared sequence + 2 ISO 7064 MOD
  97-10 check digits, allocated inside the creating transaction. Pure rules + validators.
- **Money/FX** (`common/money`, `modules/fx`, D9): decimal.js, HALF_EVEN to 2 dp at the end,
  rates to 6 dp; `FxService.toLocal` uses the latest stored rate (`FX_RATE_UNAVAILABLE` if
  none); `GET /fx/latest|history`.
- **CSV pipeline** (`common/csv`, D12): csv-parse streaming → header check → zod row schema →
  business `validateRow` with a shared mutable context → `persist` in one transaction;
  per-row rejections with line, field, reason, message; `dryRun` runs everything but persist.
- **Payers**: `POST/GET/PATCH /payers`, 360° `GET /payers/:id` (assessments, payments,
  balances; water accounts placeholder), suspend/reactivate, duplicate detection on
  create/update (exact match on E.164 phone, lower-cased email, national id → `DuplicateFlag`
  rows returned as `warnings`), review queue + `POST /payers/duplicates/:id/review`.
- **Revenue types** CRUD; delete deactivates when assessments reference the type.
- **Assessments**: amount from FIXED rate or PERCENT × base; control number in the same
  transaction; advanced filters (payer/TIN, type, amount range, status, created range, due
  range, control number) + `export.csv` with the same filters; detail with payments; cancel
  when unpaid; ledger methods `applyPayment`/`reversePayment` with `FOR UPDATE` row lock and
  `OVERPAYMENT` rejection.
- **Payments**: `GET /payments/capture/lookup` (payer + outstanding), `POST /payments/capture`
  (cash/bank/mobile money, reference required for non-cash, duplicate reference →
  `DUPLICATE_PAYMENT`, USD converted at the stored rate), list filters (payer, revenue type via
  assessment, local amount range, channel, status, currency, paid-at range, control number,
  bulkUploadId). `recordConfirmedPayment` is the single apply path reused by the importer.
- **Bulk uploader**: `POST /bulk-uploads/revenue-transactions?dryRun` (multipart, 5 MB cap,
  CSV MIME/extension check), validation order: schema → check digits → assessment exists &
  payable → amount > 0 → reference required for non-cash → reference unique in file and DB →
  capturer exists → FX available → amount ≤ outstanding *after earlier rows*; accepted rows
  become CONFIRMED payments through the capture path; file stored under
  `STORAGE_DIR/uploads/<id>.csv`; `GET /bulk-uploads[/:id]`, `template.csv`.
- **Reversals**: capture (CONFIRMED only, one pending per payment), approve/reject with the
  hard SoD rule `capturedById === deciderId → 403 SOD_VIOLATION` regardless of permissions;
  approval reverses the payment and the assessment ledger in one transaction.
- **Self-service**: `GET /me` returns the profile of the payer linked to the user.
- **Seed**: 6 revenue types (incl. `WATER` GL carrier), 1 FX rate, 200 payers (5 deliberate
  duplicates, flagged), 1,500 assessments over 12 months (first 20 reserved unpaid for the
  sample CSV), 900 CONFIRMED payments (15 % USD, mixed channels), 10 reversals (4 approved,
  3 rejected, 3 pending), `customer1@` linked to a payer. Demo data is skipped when payers
  already exist, so re-seeding stays fast and idempotent. `docs/samples/revenue-transactions.sample.csv`
  (20 rows: 16 valid, 4 invalid — bad check digit, unknown assessment, over-payment,
  duplicate reference in file).
- **Web**: payers list (search/type/status filters) + register (duplicate warnings after
  save) + profile tabs (assessments / water accounts / payments / balance) + duplicate review
  queue; revenue types admin; assessments list with full `FilterBar`, CSV export, detail
  drawer with payments and cancel, create form with live amount preview; payment capture with
  control-number lookup; payments list with filters and "Reverse" row action; reversal
  approval queue (SoD error surfaces as a toast); bulk upload page with reusable `CsvUploader`
  (dry run → preview → confirm → summary + rejected-rows download); customer portal `/me`.
  Shared `MoneyText`, `StatusBadge`, `FilterBar`, `PageHeader`.

**Tests:** 126 total — api unit 78 (TIN/control-number generate+validate incl. bad check digit,
money rounding/conversion, FIXED vs PERCENT, payment application part/paid/over-payment,
reversal ledger, phone/email/national-id normalisation and duplicate detection, CSV helpers,
row schema rejections, reversal SoD rule, plus phase 1 suites), api e2e 37 (registry: TIN,
duplicate flag + review, phone validation, control number, PERCENT base, filters + CSV export,
360° + `/me`, suspend; revenue: lookup, cash + USD capture, over-payment, missing/duplicate
reference, filters, reversal SoD + approval ledger; bulk: dry run 16/4 with reasons, import,
missing columns, non-CSV, template), mocks 4, web 7. Lint and typecheck clean.

**Verified manually (headless Chromium):** payers list, register with an existing phone →
duplicate warning, profile tabs and balances, assessment amount preview, list + status filter +
detail drawer, control-number lookup and cash capture, reversal request from the payment row,
bulk dry run 16/4 → confirm → 16 imported, supervisor approval, duplicate queue, customer `/me`.
No page errors or 5xx.

**Decisions and deviations (why)**
- **Control-number check digits use ISO 7064 MOD 97-10** (IBAN style): the body × 100 mod 97
  complement, validated as whole-number mod 97 = 1. TIN uses ISBN-style mod 11 with weights
  10..2; bodies that would need check digit "10" are not issued so the TIN stays all-digit.
- **Over-payment inside a file is checked against the running balance**, so two rows paying
  the same assessment cannot together exceed it; the first row wins.
- **Bulk rows keep their real channel** (`CASH`/`BANK`/`MOBILE_MONEY`) and are tagged with
  `bulkUploadId`; the `BULK` channel value remains for seeded legacy data and phase 4 statements.
- **Demo seed uses `createMany` for payers/assessments/payments**; the audit extension still
  writes one chained row per record, which is why the first seed takes ~20 s.
- **Phone normalisation** prepends `SystemConfigKey.PHONE_DEFAULT_COUNTRY_CODE` (`+252`) to
  local numbers; anything not matching E.164 is rejected rather than stored unnormalised.

**Packages added** (rule 11): `csv-parse` (D12), `multer` + `@types/multer` (multipart upload;
Nest's `FileInterceptor` needs the runtime package declared).

**Open items / limitations**
- Payment capture, lookup and the bulk importer only resolve assessments; bills join in
  phase 3 (`billId` exists on `Payment`).
- The web payer search in the assessment form queries by name/TIN/phone with a 20-row cap;
  no debounce yet.
- Customer portal is read-only; paying arrives with online channels in phase 4.
- FMIS reversal batches on approval arrive in phase 5.

## Phase 3 — water billing

**Date:** 2026-10-21

**Built**
- **Schema** (`water_billing` migration): `TariffCategory` + `TariffTier` (`[from, to)` bands,
  unique per category/from), `WaterAccount` (`WA` + 8 digits), `Meter` (dial digits, initial
  reading, `replacesMeterId` self-relation), `MeterReading` (unique per meter/date, consumption,
  abnormal flag + reason, source, upload link), `BillingCycle` (unique period, JSON stats),
  `Bill` (bill number = control number, ledger, tier breakdown JSON, flag note, PDF path),
  `Notification`; `Payment.billId` FK. All registered for audit.
- **Rules** (pure, tested): `validateTiers` (start at 0, contiguous, open-ended last band,
  non-negative rates), `computeTieredCharge` (boundaries 10/30/60, open band),
  `computeConsumption` (NORMAL / ROLLOVER `10^maxDigits − prev + cur` / REPLACEMENT from
  `initialReading`, below-previous rejection), `evaluateAbnormal` (strict > threshold % of the
  mean of up to N previous months; 200 % not flagged, 201 % flagged; no history → never),
  `arrearsOf` (unpaid remainder of earlier bills, carried across cycles), period helpers,
  `buildStatement` (opening balance before the window + running balance).
- **Tariffs** CRUD (`config.manage`), tier set replaced atomically.
- **Accounts & meters**: open account (with optional first meter), list with search, disconnect/
  reconnect, install meter, **replace meter** (old → REPLACED, new carries `replacesMeterId`);
  payer 360° view now includes water accounts, meters, last reading, bills and the statement.
- **Readings**: `POST /readings/preview` (previous reading, consumption, abnormal verdict without
  saving), `POST /readings`, `GET /readings` (account, meter, dates, abnormal, source), and
  `POST /bulk-uploads/meter-readings` on the shared CSV pipeline (unknown meter, inactive
  meter, future date, duplicate date, date before previous, below previous, schema), chaining
  later rows on earlier accepted rows for the same meter.
- **Billing cycle**: `POST /billing-cycles { period }` — every ACTIVE account in its own
  transaction; no reading → skipped with reason; bill = tiers + fixed + arrears; abnormal
  reading → `FLAGGED`; cycle → `REVIEW` with the exception report in `stats`. Flag review
  `POST /bills/:id/clear-flag|confirm-flag { note }`. `POST /billing-cycles/:id/release`
  refuses while any bill is flagged, then marks bills RELEASED and enqueues one pg-boss job
  per bill: render PDF (pdfkit) → SMS + email via the `NotificationSender` → `Notification`
  rows; `stats.notificationsSent` counts deliveries. RELEASED periods cannot be re-run;
  DRAFT/REVIEW re-runs delete their drafts (refused once a draft has payments).
- **Bills & statements**: `GET /bills` (cycle, account, payer, status, flagged, number),
  `GET /bills/:id`, `GET /bills/:id/pdf` (rendered lazily if missing), statement JSON and PDF
  per account; customer endpoints `GET /me/bills/:id/pdf` and `GET /me/water-accounts/:id/statement`
  scoped to the user's own payer. Payment lookup/capture and reversals now resolve bill control
  numbers and apply to the bill ledger with the same rules as assessments.
- **Notifications module** with `NOTIFICATION_SENDER` token and an HTTP implementation for the
  mock gateway; mocks app gained `POST /sms`, `POST /email`, `GET /outbox`.
- **Seed**: 2 tariff categories (DOMESTIC 0–10/10–30/30–60/60+ at 0.50/0.90/1.40/2.00 USD-eq,
  COMMERCIAL higher), 120 accounts for 100 payers, 121 meters, 1,561 readings over 13 months
  with seasonality, 2 rollovers, 1 replacement, 3 abnormal readings in the current month,
  3 RELEASED cycles (360 bills, 227 paid), current month not run (so the demo can run it and
  see 3 flagged bills). PDFs are rendered lazily. `docs/samples/meter-readings.sample.csv`.
- **Web**: tariffs admin (tier editor with inline validation), water accounts list and detail
  (cards, consumption chart with abnormal bars, meters with replace dialog, bills with PDF,
  statement with running balance and PDF), readings list with abnormal filter, capture form
  with previous reading and live preview, CSV upload via `CsvUploader`, billing cycles list with
  run dialog, cycle page with stats cards, exception report (flagged with clear/confirm notes,
  skipped with reasons), release button disabled while flagged, released banner with
  notifications-sent count and outbox link; customer portal water tab with own bills PDF and
  statement.

**Tests:** 152 total — api unit 97 (+19: tiers incl. boundaries 0/10/30/60/500 and contiguity,
consumption NORMAL/ROLLOVER/REPLACEMENT and rejection, abnormal at 200 % vs 201 % and <3
months, arrears across two cycles, periods, running balance, bill ledger mapping), api e2e 42
(+5: invalid tiers + reading rules, CSV readings with per-row reasons, abnormal → flagged →
release blocked → cleared → released → PDF + notification row, payment against a bill +
statement, meter replacement), mocks 4, web 9 (+2: tier editor validation). Lint/typecheck clean.

**Verified manually (headless Chromium):** accounts list, detail with chart/bills/PDF
download/statement, reading preview, cycles list, run current month → 3 flagged (the seeded
anomalies) with release disabled, clear all → release → 80 notifications in the mock outbox,
customer portal water tab. No page errors or 5xx.

**Decisions and deviations (why)**
- **"Apply unallocated payments" is simplified as the prompt allows:** payments reference a
  bill's control number directly, so `paymentsApplied` stays 0 and arrears are the unpaid
  remainder of earlier bills. Recorded in `docs/ASSUMPTIONS.md`.
- **Consumption for a bill = sum of the period's readings** (previous reading = the one before
  the period), so two readings in one month bill once.
- **A reading in the future is rejected** and a reading dated before the latest reading is
  rejected (`READING_IN_FUTURE`, `VALIDATION_FAILED`), beyond the prompt's rules, because the
  running-consumption chain would otherwise be ambiguous.
- **Statement PDFs are generated in memory**; bill PDFs on disk under `STORAGE_DIR/bills`.
- **Job worker tuned** to batch 10 / 1 s polling: with batch 1 every 2 s a 120-bill release
  took four minutes to notify.
- **Mock notification endpoints arrived now** (prompt listed them for phase 4/5) because release
  needs them.

**Packages added** (rule 11): `pdfkit` + `@types/pdfkit` (D19).

**Open items / limitations**
- Seeded cycle PDFs and notifications are produced lazily / not at all (only cycles released
  through the API send notifications).
- The abnormal check averages readings of the current meter and the one it replaced, not
  older generations.
- Running a cycle for all accounts is sequential (~120 transactions); fine for the POC scale.

## Phase 4 — mocks, payments, FX, retries, channel reconciliation

**Built**
- **Schema**: `Payment` gained `channelRequestPayload`, `lastStatusCheckAt`,
  `permanentlyFailedAt`; new `ChannelStatement`, `ChannelStatementLine`, `ReconciliationRun`,
  `ReconciliationLine` (migration `channels_reconciliation`); audit covers statements and runs.
- **Mocks**: bank and mobile-money channels (initiate with delayed HMAC-signed callback, status
  with scenario handling, daily statements with `?perturb=1`), `.99/.77/.66` amount triggers,
  `POST /__scenario`, `POST /__seed-statement` so statements know seeded payments. Unit tests
  for signing, triggers and perturbation.
- **FX**: `FxRateProvider` interface with an HTTP implementation, rates stored as history
  (6 dp), stale fallback with a warning and `stale: true`, 15-minute cron,
  `GET /fx/latest|history`, `POST /fx/refresh` (pair defaults to USD → local).
- **Channels**: `ChannelClient` interface (initiate, status, statement) with HTTP clients per
  channel behind a registry (`CHANNEL_CLIENTS`), 10 s timeout, errors → `CHANNEL_UNAVAILABLE`,
  constant-time callback signature verification, statement CSV parsing.
- **Payments**: `POST /payments/initiate` (officers) and `POST /me/payments/initiate`
  (customers, own payer only); `INITIATED` → `PENDING` with the channel reference and a
  `payment.status-check` job (delay, retry limit and backoff from SystemConfig); public signed
  callback `POST /payments/callback/:channel` that is idempotent (`duplicate: true`) and
  records amount/currency mismatches as `FAILED`; status-check job that settles a final answer
  or counts the attempt and lets pg-boss retry; at the limit → `PERMANENTLY_FAILED`, e-mail to
  every holder of `payments.supervise`, `payment.permanently-failed` event;
  `GET /payments/:id` returns the channel payloads for auditors.
- **SSE**: `/events` is authenticated (`?access_token=` for EventSource) and scoped: staff
  with `payments.view` get everything, customers only their own payer's events.
- **Reconciliation**: `POST /reconciliation/runs { channel, date, perturb? }` fetches the
  statement, stores it (file + lines), matches on `channelTxnRef` and classifies lines
  (pure `classify`); list, detail with status filter, CSV export; `POST
  /reconciliation/statements` multipart for statement files; `0 1 * * *` cron for yesterday on
  every channel; a fetch failure produces a `FAILED` run.
- **Seed**: ~300 BANK/MOBILE_MONEY confirmed payments over 60 days with channel payloads,
  2 PERMANENTLY_FAILED and 3 FAILED, registered with the mocks when reachable. Seeded
  payment dates are now clamped to today (earlier seeds produced future-dated payments).
- **Web**: live-events provider over SSE; Pay online dialog with live conversion preview and
  stale badge; payments list with in-flight spinner, live toasts and detail drawer (payloads,
  attempts timeline); supervisor bell with deep links; FX page (cards, stale badge, Recharts
  history, refresh); reconciliation runs list, run dialog, statement upload, run detail with
  summary cards, status filter and CSV export; `/demo` helper page; customer portal "Pay
  online" for own assessments and bills.

**Tests:** 193 total — api unit 122 (+25: settlement decisions and retry counter, status-check
service incl. permanent failure and supervisor recipients, reconciliation classification for
all four statuses and day helpers, FX stale fallback/rounding, SSE scoping, callback
signatures and statement parsing), api e2e 48 (+6 in `channels.e2e-spec.ts` against an
in-process mocks app: initiate → signed callback → CONFIRMED with ledger update; tampered
signature 401 and replay `duplicate: true`; `.66` → 3 checks → PERMANENTLY_FAILED with
supervisor notification; customer `NOT_OWN_PAYER`; perturbed statement → 1 mismatch,
1 missing in IRCUB, 1 missing in channel; manual statement upload), mocks 9 (+5), web 14
(+5: HALF_EVEN preview, conversion preview, live status notices). Lint/typecheck clean.

**Verified manually (headless Chromium):** officer pays USD online → PENDING → CONFIRMED toast
and row flip via SSE → detail drawer with payloads; `.99` → FAILED toast; supervisor bell deep
link to permanently failed payments; FX page with refresh; perturbed reconciliation run →
detail cards, status filter, CSV download; demo page; customer pays own item via mobile money
and receives only their own live confirmation. No page errors or 5xx.

**Decisions and deviations (why)**
- **Settlement is one service for callbacks and status checks** so idempotency, mismatch
  handling and ledger application are decided once, under a row lock, by a pure rule.
- **The local amount is fixed at initiation**; a mismatching callback becomes FAILED rather than
  re-applied (ASSUMPTIONS.md). A ledger refusal on confirmation is also recorded FAILED with
  the reason, never dropped.
- **Retry limit is the handler's decision, not pg-boss's**: the job counts attempts in the
  database and stops throwing once the limit is reached, so the limit holds whatever pg-boss's
  retry semantics are; pg-boss only provides the backoff.
- **SSE token in the query string** because `EventSource` cannot send headers (ASSUMPTIONS.md).
- **FX pair parameters are optional** (default USD → local) so the web does not hard-code
  currencies.
- **E2E boots the mocks app in-process** (ports 3901/3902) instead of adding a compose
  service, so the suite stays a single `pnpm test:e2e` locally and in CI; the env overrides
  live in `test/helpers/channels-env.ts` and must load before the app modules.
- **Alert rows for permanent failures wait for phase 6** as the prompt says; the bell is fed by
  SSE for the current session.

**Packages added** (rule 11): none in the API; `decimal.js` added to the mocks for the
statement perturbation (already in DECISIONS for the API).

**Open items / limitations**
- The supervisor bell holds only events received during the session; phase 6 persists alerts.
- `prisma migrate reset` was not run on the local dev database (destructive; needs the owner):
  it still contains future-dated payments from the earlier seed, which sort above new ones in
  the payments list until the database is reseeded.
- The in-browser conversion preview uses JavaScript numbers with banker's rounding; the API's
  `decimal.js` conversion is authoritative and the stored values are what the UI shows after
  initiation.
- Statement upload trusts the file's `date` field and the chosen channel; there is no check
  that the lines belong to that day.

## Phase 5 — FMIS posting & reconciliation

**Built**
- **Schema**: `GlMapping` (unique per revenue type and effective date), `JournalBatch`
  (date, kind, status, counts, FMIS reference, attempts, last error, reversed-by link) and
  `JournalLine` (unique `paymentId`, unique `reversalId`, GL pair, amount, reference,
  reversed flag); a partial unique index keeps one COLLECTIONS batch per day
  (migration `fmis_journals`). All three are audited.
- **Mocks**: `POST /fmis/journals` (idempotent on `batchId` with a deterministic reference,
  balance validation → 422, `?fail=1` or a date ending in `13` → 500) and
  `GET /fmis/ledger?date=` (totals per GL). Unit tests for balance, triggers, reference and
  ledger.
- **GL mappings**: list / create / delete with `^\d{4,6}$` validation and effective dating;
  `resolve(revenueTypeId, date)` picks the latest `effectiveFrom ≤ date`; the seed copies each
  revenue type's `glCode` into a mapping effective from 1970.
- **Batch builder**: `buildForDate` selects CONFIRMED payments of the UTC day with no journal
  line (relation filter), resolves the revenue type (assessment → type; bill → `WATER`) and
  GL, writes the PENDING batch and lines in one transaction and enqueues posting; a unique
  violation (payment already journaled or a second batch for the day) is `DUPLICATE_POSTING`;
  nothing eligible → no batch. `build-range` for backfill, cron 00:30 for yesterday.
- **Poster job** (`fmis.post-batch`): no-op when already POSTED/REVERSED; posts a balanced
  payload (debit + credit entry per line) with the batch id as idempotency key; stores
  `fmisReference`/`postedAt`; failures count attempts, keep `lastError` and retry with backoff
  from SystemConfig (`FMIS_POST_RETRY_LIMIT`, `FMIS_POST_RETRY_DELAY_SECONDS`), then FAILED;
  `POST /fmis/batches/:id/retry`; PENDING batches are re-enqueued on boot; SSE
  `fmis.batch.updated`.
- **Reversals → FMIS**: approving a reversal of a posted payment creates a REVERSAL batch for
  today with the mirrored line (debit/credit swapped, `reversalId` set), posts it and marks the
  original batch REVERSED only when all its lines are reversed; unposted lines are dropped.
- **Traceability**: `GET /fmis/batches` (date range, status, kind), `GET /fmis/batches/:id`
  with lines (payment, payer, control number, revenue type, GL), `GET /fmis/lines?paymentId|
  controlNumber`, and `GET /payments/:id` now carries `journalLine { batchId, batchStatus,
  batchDate, fmisReference, reversed }`.
- **Reconciliation**: `GET /fmis/reconciliation?from&to` → per (day, GL) net credit on both
  sides, difference and MATCHED / MISMATCH / MISSING_IN_FMIS; drill-down
  `GET /fmis/reconciliation/:date/:glCode`; CSV export; FMIS ledger cached 60 s; range capped
  at 62 days.
- **Seed**: mappings for all 6 revenue types; 31 days of batches built from confirmed
  payments (and approved reversals of posted payments, which get REVERSAL batches); posted to
  the mocks when reachable, yesterday left PENDING and the day before FAILED for the demo.
- **Web**: FMIS tabs — batches list (status badges, counts, totals, reference, attempts with
  the last error on hover, Build for date with the demo failure checkbox, Retry), batch detail
  (cards, lines, payment drawer with the FMIS chain and "Open batch"), reconciliation matrix
  (range, totals, highlighted differences, drill-down drawer → lines → payment drawer,
  export), GL mappings admin (effective-dated rows, add/remove).

**Tests:** 232 total — api unit 142 (+20: mapping resolution, line drafting, balanced payload,
attempt limit, reversal status rule, net credits, reconciliation verdicts, day helpers; poster
idempotent on POSTED, retry → FAILED with lastError; builder unique violation →
DUPLICATE_POSTING, reversal batch creation, original status rule, dropped unposted line,
retry guard), api e2e 53 (+5 in `fmis.e2e-spec.ts` with the in-process mocks: build → post →
reference stored, rebuild adds nothing, late payment → DUPLICATE_POSTING, payment detail and
lines traceability; reversal → mirrored batch and original REVERSED; `13` day fails after 3
attempts, forced failure + retry succeeds; reconciliation MATCHED, drill-down and CSV; GL
mapping CRUD with duplicate and format rejections), mocks 13 (+4), web 14. Lint/typecheck
clean.

**Verified manually (headless Chromium):** seeded batches list with a FAILED row → Retry →
POSTED; Build for date; batch detail with reference and lines → payment drawer showing the
FMIS chain; reconciliation matrix with MATCHED rows, drill-down drawer and CSV export; GL
mapping add/remove. No page errors or 5xx.

**Decisions and deviations (why)**
- **Reversal lines carry `reversalId`, not `paymentId`**, because `paymentId` is unique (the
  double-posting guard); the payment is reachable through the reversal and the lines endpoint
  resolves both.
- **One COLLECTIONS batch per day is a partial unique index** written by hand in the
  migration (Prisma cannot express it); REVERSAL batches are one per approved reversal.
- **The retry limit is decided by the handler from the stored attempt count**, as for payment
  status checks, so it holds regardless of pg-boss retry semantics.
- **Reconciliation totals are net credits** (ASSUMPTIONS.md) rather than separate debit and
  credit columns.
- **PENDING batches are re-enqueued on boot** so seeded or orphaned batches never stay stuck.
- **The FMIS hook runs after the reversal transaction**, so a posting problem can never undo
  an approved reversal.

**Packages added** (rule 11): none.

**Open items / limitations**
- A payment confirmed after its day's batch exists is only journaled by a manual build and is
  reported as `DUPLICATE_POSTING` until then (ASSUMPTIONS.md); phase 6 could add an alert.
- The seeded REVERSAL batch depends on an approved reversal whose payment was posted: on a
  database seeded before this phase the phase-2 reversals all fall on "today" (the earlier
  date clamp), so no REVERSAL batch is seeded there; a fresh seed spreads those dates and
  produces one, and approving a reversal in the UI always does.
- The reconciliation matrix is computed per request (one ledger call per day, cached 60 s);
  fine for the POC's 62-day cap.
- Alert rows for FAILED batches arrive with phase 6.

## Phase 6 — dashboard, forecast, alerts

**Built**
- **Schema**: `DailyCollectionSummary` (day × revenue type × channel: total, count, reversed
  total/count; indexed on date and on revenue type + date), `DailyBillingSummary` (day: water
  billed vs collected), `RevenueTarget` (period × revenue type), `Alert` (type, severity,
  title, message, data, acknowledgement); migration `dashboard_summaries_alerts`; targets and
  alerts audited.
- **Aggregation**: `rebuildDailySummaries(from, to)` (plain function shared with the seed)
  recomputes both summary tables from payments (CONFIRMED and REVERSED by `paidAt`),
  approved reversals (by decision date) and released bills (by period end); hourly cron for
  the last two days; `markDirty(day)` called by payment capture/settlement, reversal approval
  and billing release rebuilds that day after a 5 s debounce; `POST /dashboard/rebuild`.
- **Endpoints** (`dashboard.view`, summaries only): overview KPIs (collected, vs same period
  last year, count, reversed, outstanding assessments and water, water collection efficiency,
  tax target attainment), trends (day/week/month × revenue type/channel), target attainment
  per type and month, water efficiency per month, forecast; `Cache-Control: private,
  max-age=30` on overview and trends. Targets CRUD + CSV import/template (`targets.manage`).
  Alerts list, unacknowledged count, evaluate, acknowledge (`alerts.view`).
- **Forecast**: last 12 complete months → OLS (`simple-statistics`) with slope, intercept,
  R² and a caveat that flags a weak fit; `model=holt-linear` runs Holt's linear smoothing
  (α 0.5, β 0.3); `by=revenueType` fits one series per type; projections floored at zero;
  `INSUFFICIENT_HISTORY` below three points.
- **Alerts**: every 5 min and on demand, today's collections so far vs the trailing 30 daily
  totals scaled by the elapsed fraction of the day (z ≤ −2 WARNING, ≤ −3 CRITICAL) and today's
  approved reversals vs trailing daily counts (z ≥ 2 / 3); stddev-zero and < 5-day guards;
  event alerts from payments (PAYMENT_PERMANENTLY_FAILED), FMIS (FMIS_BATCH_FAILED) and
  billing runs (ABNORMAL_CONSUMPTION); one open alert per type and de-duplication key;
  `alert.created` over SSE to holders of `alerts.view` (scope added to the SSE rules).
- **Seed**: full summary rebuild for the last 12 months (1,172 daily rows) and 80 targets
  (12 past + 3 future months × 5 tax types at 110 % of the average month).
- **Web**: executive dashboard (landing for anyone with `dashboard.view`): KPI cards, range
  presets (30d, 90d, YTD, 12m), trends chart with by/groupBy toggles, collections vs targets
  bars with attainment, water billed vs collected combo, forecast chart (history solid,
  projection dashed, OLS/Holt toggle, R², slope, caveat), live alerts panel with
  acknowledge; header alert bell with unacknowledged count and toast on new alerts; KPIs
  refetch every 60 s and SSE events invalidate the dashboard queries; targets admin page
  (inline edits + CSV import).
- **Bench**: `pnpm --filter api bench` → `/dashboard/trends` for 12 months grouped by day,
  20 runs on the seed data: **p50 11.7 ms, p95 22.2 ms**.

**Tests:** 251 total — api unit 158 (+16: aggregation totals and reversals, billing
aggregation, buckets, trend series, OLS on a linear series (slope/intercept/R² = 1), Holt on
a known series, period helpers, z-score with stddev-zero and sample guards, thresholds at
−1.9/−2.1/−3.1 and direction, day fraction, alert de-duplication), api e2e 57 (+4: overview
and trends within budget with cache header, forecast horizon and Holt per type, seeded drop →
COLLECTION_DROP raised → delivered over SSE → de-duplicated → acknowledged (409 on repeat),
targets upsert/import/attainment), mocks 13, web 19 (+5: preset ranges, forecast dashed-split
rows, percent formatting; AlertsPanel renders the severity badge and acknowledges / hides the
button without permission). Lint/typecheck clean.

**Verified manually (headless Chromium):** supervisor lands on the dashboard with KPI cards
and charts; trend toggles; forecast toggles to Holt with its caveat; 12-month preset; the
alerts panel and bell react live to `POST /alerts/evaluate`; acknowledge; targets inline edit;
a customer does not land on the dashboard. No page errors or 5xx.

**Decisions and deviations (why)**
- **Summaries are rebuilt per day, not incremented per event**: a full-day recompute is one
  query per source table and cannot drift; the 5 s debounce absorbs bulk uploads.
- **"Same-hour cumulative" baseline approximated by scaling daily totals** by the fraction of
  the day elapsed (ASSUMPTIONS.md); hourly summaries would be the next step.
- **OLS stays the default; Holt is the "or better"** option (interpretable with 12 points).
- **Dedupe key stored inside `Alert.data`** rather than a dedicated column, keeping the model
  as specified; the open-alert lookup filters on it.
- **Two e2e suites now derive FX expectations from the payment's own rate** instead of the
  seeded 571.5: with the mock FX reachable the rate drifts per call, which made them
  time-dependent.
- **Web test setup stubs `matchMedia` and `ResizeObserver`** and cleans up between tests so
  Mantine components can be rendered under jsdom.

**Packages added** (rule 11): `simple-statistics` 7.8.8 (D18).

**Open items / limitations**
- Anomaly baselines use daily summaries scaled by time of day; intra-day shape is not
  modelled.
- The forecast uses whole-platform or per-type monthly totals; no seasonality, no confidence
  bands.
- The dashboard re-queries on every SSE payment event (debounced only by TanStack Query);
  acceptable at POC volumes.

## Phase 7 — deliverables & deployment
_(pending)_
