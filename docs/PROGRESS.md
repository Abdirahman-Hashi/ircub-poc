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
_(pending)_

## Phase 4 — mocks, payments, FX, retries, channel reconciliation
_(pending)_

## Phase 5 — FMIS posting & reconciliation
_(pending)_

## Phase 6 — dashboard, forecast, alerts
_(pending)_

## Phase 7 — deliverables & deployment
_(pending)_
