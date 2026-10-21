# IRCUB POC — Project Instructions for Claude Code

Integrated Revenue Collection & Utility Billing Platform. A 5-day take-home proof of concept
for Farsight Africa Technologies (Software Developer role). The full brief is in
`docs/BRIEF.md`; every architectural decision is recorded in `docs/DECISIONS.md`; every
assumption we make must be appended to `docs/ASSUMPTIONS.md`.

**Read `docs/BRIEF.md`, `docs/DECISIONS.md` and `docs/ENGINEERING-STANDARDS.md` before
starting any phase.** The decisions are final — do not re-litigate the stack or swap
libraries. If something in a phase prompt contradicts `docs/DECISIONS.md`, the decisions file
wins; flag the conflict in your report. The engineering standards are not optional and are
enforced by lint, hooks, CI and `/review`.

## This is a seniority assessment

The panel is judging engineering judgement, not feature count. Every file should look like
it was written by a senior engineer who expects to maintain it: clear layering, invariants
enforced by the database, pure rule functions with tests, no magic values, typed contracts,
explicit error codes, structured logs, documented trade-offs. When in doubt between "quick"
and "right", choose right and keep it small. Never leave a shortcut undocumented.

## How work is organised

Build happens in numbered phases, each a slash command in `.claude/commands/`:

| Command    | Scope                                                          |
|------------|----------------------------------------------------------------|
| `/phase-0` | Monorepo scaffold, Docker Compose, Prisma, tooling, CI-ish scripts |
| `/phase-1` | Auth, RBAC, segregation of duties, audit log, seed             |
| `/phase-2` | Payer registry, revenue types, assessments, bulk CSV uploader  |
| `/phase-3` | Water: meters, readings, billing cycle, PDF bills, statements  |
| `/phase-4` | Mock external services + payments, FX, retries, channel recon  |
| `/phase-5` | FMIS GL mapping, journal batches, idempotent posting, recon    |
| `/phase-6` | Executive dashboard, forecast, anomaly alerts, SSE             |
| `/phase-7` | Deliverables: tests sweep, OpenAPI, Postman, ERD, README, deploy |
| `/review`  | Self-audit against the brief's checklist (run before `/phase-7` and at the end) |

Run them in order. Each phase ends with: tests green, lint clean, a conventional commit
(or several), and `docs/PROGRESS.md` updated with what was done, what was skipped, and why.

## Stack (fixed — see docs/DECISIONS.md for rationale)

- **Monorepo:** pnpm workspaces. `apps/api` (NestJS 10+, TypeScript strict), `apps/web`
  (Vite + React 18 + TypeScript, Mantine UI, TanStack Query/Router, react-hook-form + zod,
  Recharts), `apps/mocks` (small NestJS app simulating bank, mobile money, FX rates, FMIS,
  SMS, email), `packages/shared` (enums, permission codes, DTO types shared by api & web).
- **Database:** PostgreSQL 16 via Prisma. Local: Docker Compose. Hosted: Neon.
- **Jobs/retries:** pg-boss (Postgres-backed queue) + `@nestjs/schedule` crons. No Redis.
- **Real-time:** Server-Sent Events (`@Sse()`), not WebSockets.
- **Auth:** Passport JWT access token (15 min) + refresh token in httpOnly cookie; argon2;
  TOTP 2FA via `otplib` (optional per user).
- **Validation:** class-validator + class-transformer on DTOs; `ValidationPipe` global with
  `whitelist: true, forbidNonWhitelisted: true, transform: true`.
- **API docs:** `@nestjs/swagger`; `openapi.json` is generated and committed to `docs/`.
- **PDF:** pdfkit. **CSV:** csv-parse (streaming). **Stats:** simple-statistics.
- **Tests:** Jest + supertest (api), Vitest + Testing Library (web).
- **Deploy:** Docker Compose (primary), Render (api, mocks, static web) + Neon (hosted demo).

## Repository layout

```
ircub-poc/
├── apps/
│   ├── api/          NestJS — src/modules/<domain>/{*.controller,*.service,*.module,dto/,entities/}
│   ├── web/          Vite React SPA — src/{app,features/<domain>,components,lib,api}
│   └── mocks/        NestJS — src/{rates,bank,momo,fmis,notifications}
├── packages/shared/  enums, permission codes, shared types (no runtime deps)
├── docs/             BRIEF.md, DECISIONS.md, ASSUMPTIONS.md, PROGRESS.md, ERD, openapi.json, postman/
├── docker-compose.yml
├── render.yaml
└── README.md
```

## Hard rules

1. **No real data.** All names, IDs, phones, emails, amounts are generated (faker) or invented.
2. **Money is `Decimal`, never `number`.** Prisma `Decimal(18,2)` for amounts, `Decimal(18,6)`
   for FX rates. Use `decimal.js` for arithmetic. Local currency is **SOS**; USD also supported.
3. **Every mutation of a business entity is audited.** The Prisma client extension in
   `apps/api/src/common/audit/` writes an `AuditLog` row (actor, entity, entityId, action,
   before, after, hash chain). Never bypass it with raw SQL for business tables.
4. **Permissions are data.** Permission codes live in `packages/shared/src/permissions.ts`
   as `resource.action` strings and are seeded into the DB. Controllers use
   `@RequirePermission('code')`. Never hard-code role names in business logic — check
   permissions, not roles. The one exception is seeding the six built-in roles.
5. **Segregation of duties is enforced server-side** (`reversal.capturedById !== approverId`)
   and additionally via the configurable `SodRule` table. Tests must cover both.
6. **Idempotency at the database level:** unique constraints on `JournalLine.paymentId`,
   `Payment(channel, channelTxnRef)`, `Assessment.controlNumber`, `Payer.tin`.
7. **Error handling:** throw Nest `HttpException` subclasses from services with a stable
   `code` field (e.g. `SOD_VIOLATION`, `READING_BELOW_PREVIOUS`, `DUPLICATE_POSTING`). A global
   exception filter returns `{ statusCode, code, message, details? }`. Never swallow errors
   silently; log with Nest `Logger`.
8. **Every business rule gets a unit test.** Tariff tiers, arrears, rollover, abnormal
   consumption, SoD, FX conversion, retry limit, duplicate detection, regression forecast,
   anomaly detection, CSV validation, hash chain verification.
9. **State assumptions** in `docs/ASSUMPTIONS.md` as you make them, one bullet each, phrased
   as "We assume X because Y; if wrong, Z changes."
10. **Commits:** Conventional Commits (`feat(api): …`, `feat(web): …`, `test(api): …`,
    `chore: …`, `docs: …`). One logical change per commit. Never `wip`, never squash the
    history. Commit at least at the end of every phase; preferably after each module.
11. **Do not install packages not listed in DECISIONS.md** without noting why in the phase
    report. Prefer what NestJS / Mantine already provide.
12. **Keep `README.md` current** — stack, setup, run, test, seed users/passwords, assumptions,
    limitations, AI-assistance declaration. Phase 7 finalises it, but each phase adds its section.
13. **AI assistance declaration is mandatory** (brief requirement). README must state that
    Claude Code was used, for what (scaffolding, boilerplate, tests, docs), and that all code
    was reviewed by the candidate. Write code the candidate can explain: clear names, short
    functions, comments on *why* for any non-obvious rule, no clever one-liners.
14. **No hard-coded values.** Every number, string code, threshold, duration, URL, GL code,
    role/permission/status string, job name or message lives in exactly one named place
    (`SystemConfig`, env schema, `*.constants.ts`, `packages/shared` enums/codes, seed) and is
    imported. `0`, `1`, `-1` and Nest's `HttpStatus` are the only literals allowed in logic.
    See `docs/ENGINEERING-STANDARDS.md` §1 for the placement table.
15. **Types are declared in type files, never inline.** DTOs in `dto/*.dto.ts` (one class per
    file), domain types in `<domain>.types.ts`, shared types in `packages/shared/src/types/`,
    job payloads in `common/jobs/job-payloads.ts`, error codes in `packages/shared/src/error-codes.ts`,
    config keys in `system-config.keys.ts`. A service, controller or component file declares
    nothing but the class/component it exports. See §2.
16. **Pure rules in `*.rules.ts`.** Tariff maths, consumption, check digits, FX rounding,
    z-scores, regression: pure functions, no Nest/Prisma imports, unit-tested in isolation.
17. **External systems behind interfaces** (`ChannelClient`, `FmisClient`, `FxRateProvider`,
    `NotificationSender`) with injected HTTP implementations; tests inject fakes.
18. **Observability:** `x-request-id` on every request, structured logs with module +
    requestId + entity ids, separate `/health` and `/ready`.

## Commands (after phase 0)

```bash
pnpm install
docker compose up -d postgres            # local DB
pnpm --filter api prisma migrate dev     # apply migrations
pnpm --filter api prisma db seed         # seed roles, users, demo data
pnpm dev                                 # api :3000, mocks :3100, web :5173 (concurrently)
pnpm test                                # all unit + e2e tests
pnpm lint && pnpm typecheck
docker compose up --build                # full stack: postgres, api, mocks, web (nginx)
```

## Seeded demo users (password for all: `Passw0rd!2026`)

| Email                      | Role                   |
|----------------------------|------------------------|
| admin@ircub.test           | System Administrator   |
| supervisor@ircub.test      | Revenue Supervisor     |
| officer@ircub.test         | Revenue Officer        |
| water@ircub.test           | Water Billing Officer  |
| auditor@ircub.test         | Auditor                |
| customer1@ircub.test       | Taxpayer/Customer      |

## Working style

- Start each phase by reading its command file fully, then `docs/PROGRESS.md`, then the
  relevant Prisma models. Plan briefly (a short list), then build module by module.
- Run `pnpm --filter api test` after each module, not only at the end.
- When a requirement is ambiguous, pick the simplest reading that satisfies the brief's
  literal "Output" bullet, implement it, and record the assumption. Do not stop to ask unless
  the choice is irreversible (schema shape that later phases depend on).
- Keep the UI functional and consistent, not fancy: Mantine defaults, AppShell with
  role-filtered navigation, DataTables with filters, forms with inline validation, toasts.
- End every phase with a short report: what was built, test counts, commits made, open
  items. Append it to `docs/PROGRESS.md`.
