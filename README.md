# IRCUB — Integrated Revenue Collection & Utility Billing Platform (POC)

[![CI](https://github.com/Abdirahman-Hashi/ircub-poc/actions/workflows/ci.yml/badge.svg)](https://github.com/Abdirahman-Hashi/ircub-poc/actions/workflows/ci.yml)

**Author and distributor:** Abdirahman Hashi

A proof of concept for a Federal Member State revenue platform: payer registry, assessments
with control numbers, water metering and tiered billing, multi-channel payments in SOS and
USD, reconciliation against bank, mobile money and the FMIS general ledger, and an executive
dashboard with forecasts and anomaly alerts. Built as a five-day take-home assessment; the
full brief is in `docs/BRIEF.md`, every architectural decision in `docs/DECISIONS.md`, and
the engineering rules the code is held to in `docs/ENGINEERING-STANDARDS.md`.

## Stack

| Layer    | Choice                                                                                   |
| -------- | ---------------------------------------------------------------------------------------- |
| Monorepo | pnpm workspaces: `apps/api`, `apps/web`, `apps/mocks`, `packages/shared`                 |
| API      | NestJS 11, TypeScript strict, Prisma 6 on PostgreSQL 16, pg-boss jobs, SSE, Swagger      |
| Web      | Vite 7, React 18, Mantine 7, mantine-react-table, TanStack Query + Router, zod, Recharts |
| Mocks    | Small NestJS app simulating FX rates, bank, mobile money, FMIS, SMS and email            |
| Shared   | `@ircub/shared`: enums, permission codes, error codes, constants, contract types         |
| Quality  | ESLint (type-aware, standards-enforcing), Prettier, husky + lint-staged, commitlint, CI  |
| Tests    | Jest + supertest (api), Jest (mocks), Vitest + Testing Library (web)                     |
| Deploy   | Docker Compose (primary); Render + Neon for the hosted demo (phase 7)                    |

## Prerequisites

- Node 22 (`.nvmrc`), pnpm 10+ (`corepack enable` or `npm i -g pnpm`)
- Docker Desktop (Postgres locally, and the full-stack Compose run)

## Local development

```bash
cp .env.example .env                     # every variable is documented inline
pnpm install                             # also builds @ircub/shared and installs git hooks
docker compose up -d postgres            # Postgres 16 on $POSTGRES_PORT (default 5432)
pnpm --filter api prisma migrate dev     # apply migrations (reads the root .env)
pnpm --filter api prisma db seed         # seed reference data (roles/users arrive in phase 1)
pnpm dev                                 # api :3000, mocks :3100, web :5173
```

- API docs: http://localhost:3000/docs · liveness `GET /health` · readiness `GET /ready`
- Mocks docs: http://localhost:3100/docs · `GET /rates?base=USD` · `POST /__reset`
- Web: http://localhost:5173

If ports 5432/5433 are taken on your machine, set `POSTGRES_PORT` / `TEST_POSTGRES_PORT` in
`.env` and adjust `DATABASE_URL` / `TEST_DATABASE_URL` to match.

## Tests and checks

```bash
pnpm lint && pnpm typecheck              # ESLint (standards rules) + tsc for every package
pnpm test                                # unit tests in all packages
docker compose -f docker-compose.test.yml up -d --wait
pnpm test:e2e                            # migrates the throwaway test DB, then supertest suites
```

Lint deliberately fails on a numeric literal in business code, an `interface` declared
outside a type file, or an `any`; commitlint rejects non-conventional messages.

## Full stack with Docker Compose

```bash
docker compose up --build                # postgres, api (migrates on start), mocks, web
```

- Web (nginx): http://localhost:8080 — `/api/*` is proxied to the API container
- API: http://localhost:3000/docs · Mocks: http://localhost:3100/docs

## Repository layout

```
apps/api        NestJS — src/{config,prisma,common/{errors,context,logging,auth,jobs,sse},modules/<domain>}
apps/web        React SPA — src/{app,api,lib,components,features/<domain>}
apps/mocks      NestJS — src/{config,store,rates,control,health} (bank, momo, fmis, notifications in phase 4/5)
packages/shared enums, permissions, roles, error codes, constants, contract types
docs/           BRIEF, DECISIONS, ENGINEERING-STANDARDS, ASSUMPTIONS, PROGRESS, openapi.json
```

## Seeded demo users

Created by the phase 1 seed. Password for all: `Passw0rd!2026`.

| Email                 | Role                  |
| --------------------- | --------------------- |
| admin@ircub.test      | System Administrator  |
| supervisor@ircub.test | Revenue Supervisor    |
| officer@ircub.test    | Revenue Officer       |
| water@ircub.test      | Water Billing Officer |
| auditor@ircub.test    | Auditor               |
| customer1@ircub.test  | Taxpayer/Customer     |

## Authentication and authorisation (phase 1)

- Log in with a seeded user; the response carries a 15-minute access token and sets an
  httpOnly refresh cookie scoped to `/auth`. The SPA keeps the access token in memory only.
- Optional TOTP two-factor: Account menu → Two-factor authentication → scan the QR code.
- Permissions are data (`packages/shared/src/permissions.ts`, seeded into the database) and
  roles inherit from their parent. Administration → Roles & permissions shows the matrix with
  inherited permissions greyed out.
- Segregation of duties: Administration → Segregation of duties. Try assigning the Revenue
  Supervisor role to `officer@ircub.test` — the API rejects it with `SOD_VIOLATION`.
- Audit log: every mutation of an audited model is hash-chained; `GET /audit/verify`
  recomputes the chain. Production hardening (least-privilege database role with INSERT +
  SELECT only on `audit_log`) is documented in the migration SQL.

## Registry and revenue collection (phase 2)

- Register a payer (Payers → Register): the TIN is generated; a matching phone, email or
  national ID raises a duplicate warning that supervisors review under Payers → Duplicate review.
- Create an assessment (Assessments → New): the amount previews from the revenue type
  (fixed amount or percentage of a base) and the 12-digit control number is allocated on save.
- Capture a payment (Payments → Capture): look up the control number, enter the amount in SOS
  or USD (converted at the stored rate); over-payments are rejected.
- Bulk upload (Bulk upload): try `docs/samples/revenue-transactions.sample.csv` — the dry run
  reports 16 accepted and 4 rejected rows with reasons before anything is saved.
- Reversals: an officer requests one from a payment row; a supervisor approves it under
  Reversals. The requester can never approve their own request (`SOD_VIOLATION`).
- `customer1@ircub.test` sees only their own assessments and payments under My account.

## Water billing (phase 3)

- Water billing → accounts: each account shows its meters, a consumption chart (abnormal
  readings in red), bills with PDF download and a statement with a running balance.
- Readings → Capture: pick a meter, enter the value, preview the consumption and the
  abnormal verdict before saving. Rollover and replacement follow the D13 rules. Readings →
  Upload CSV: try `docs/samples/meter-readings.sample.csv`.
- Billing cycles → Run cycle for the current month: the seed leaves three abnormal readings,
  so three bills are flagged and the release button stays disabled until each is cleared or
  confirmed with a note. Release renders PDFs and sends SMS/email through the mock gateway;
  the outbox is at http://localhost:3100/outbox.
- `customer1@ircub.test` sees their water account, bills (PDF) and statement under My account.

## Online payments, FX and channel reconciliation (phase 4)

- Payments → Pay online: look up a control number, choose bank or mobile money and a
  currency; the dialog previews the converted amount at the latest rate (flagged when
  stale). The row appears as PENDING and flips to CONFIRMED or FAILED through Server-Sent
  Events without a reload; Details opens the channel request and callback payloads with the
  status-check timeline.
- Demo scenarios (Administration → Demo helper): amounts ending `.99` are declined, `.77`
  are confirmed by the status-check job, `.66` exhaust the checks and become PERMANENTLY
  FAILED, e-mail every holder of `payments.supervise` and light the supervisor bell.
- FX rates: latest quote with provenance, stale indicator and history chart; the rate is
  refreshed every 15 minutes from the mock provider and falls back to the last stored one.
- Reconciliation: run for a channel and day (tick "perturbed statement" to see all four line
  statuses), open the run for summary cards, filterable lines and CSV export, or upload a
  statement file received out of band. A daily job reconciles yesterday for every channel.
- `customer1@ircub.test` can pay their own assessments and bills under My account and only
  receives live updates for their own payer.

## FMIS posting and reconciliation (phase 5)

- FMIS → Journal batches: one batch per day is built at 00:30 from confirmed payments not yet
  journaled (one line per payment: debit the cash control GL, credit the revenue GL) and
  posted to the mock FMIS with the batch id as idempotency key; the FMIS reference is stored
  on the batch. The seed leaves yesterday's batch PENDING (posted on boot) and the day before
  FAILED so you can click Retry. "Build for date" with the demo checkbox shows the retry path.
- Open a batch for its lines; each line opens the payment drawer, which shows the full chain
  payment → line → batch → FMIS reference. A reversal approved under Reversals produces a
  mirrored REVERSAL batch and flags the original line.
- FMIS → Reconciliation: posted totals per day and GL against the FMIS ledger, with
  MATCHED / MISMATCH / MISSING IN FMIS, a drill-down to the lines and CSV export.
- FMIS → GL mappings: effective-dated revenue type → GL code rows; the latest row on or before
  the batch date is used.

## Executive dashboard (phase 6)

- Supervisors, administrators and auditors land on the dashboard: KPI cards (collected vs
  the same period last year, reversals, outstanding assessments and water, water collection
  efficiency, tax target attainment), revenue trends by revenue type or channel per
  day/week/month, collections vs targets, water billed vs collected, and a forecast of the
  next three months (OLS regression by default, Holt smoothing on toggle) with R² and a
  caveat. Everything reads pre-aggregated daily summaries rebuilt hourly and within five
  seconds of a payment, reversal or billing change; `/dashboard/trends` for 12 months answers
  in about 12 ms (p50) on the seed data (`pnpm --filter api bench`).
- Alerts: collections drop and reversal spike (z-scores against the trailing 30 days,
  evaluated every 5 minutes or on demand), permanently failed payments, failed FMIS batches
  and abnormal consumption. They arrive live over Server-Sent Events into the dashboard panel
  and the header bell; acknowledge them from the panel.
- Targets: monthly targets per revenue type with inline edits and CSV import
  (`period, revenue_type_code, amount`).

## Assumptions

Recorded as they are made in `docs/ASSUMPTIONS.md` and copied here in phase 7.

## Known limitations

Collected per phase in `docs/PROGRESS.md` and consolidated here in phase 7.

## AI assistance declaration

Claude Code (Anthropic) was used throughout this project for scaffolding, boilerplate,
test writing, documentation drafts and as a pair-programming assistant, driven by the
phase prompts in `.claude/commands/` and the rules in `CLAUDE.md`. Every line was reviewed
by the candidate, Abdirahman Hashi, who takes responsibility for the design decisions (`docs/DECISIONS.md`),
the code and its trade-offs, and can explain any part of it.
