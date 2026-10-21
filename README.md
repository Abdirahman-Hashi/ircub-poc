# IRCUB — Integrated Revenue Collection & Utility Billing Platform (POC)

[![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/ci.yml)

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

## Assumptions

Recorded as they are made in `docs/ASSUMPTIONS.md` and copied here in phase 7.

## Known limitations

Collected per phase in `docs/PROGRESS.md` and consolidated here in phase 7.

## AI assistance declaration

Claude Code (Anthropic) was used throughout this project for scaffolding, boilerplate,
test writing, documentation drafts and as a pair-programming assistant, driven by the
phase prompts in `.claude/commands/` and the rules in `CLAUDE.md`. Every line was reviewed
by the candidate, who takes responsibility for the design decisions (`docs/DECISIONS.md`),
the code and its trade-offs, and can explain any part of it.
