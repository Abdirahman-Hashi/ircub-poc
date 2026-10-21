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
- CI badge in README points at `OWNER/REPO`; replace once the GitHub remote exists.
- Mocks app returns Nest's default validation error shape (no global filter); it is not part
  of the IRCUB API contract. Revisit in phase 4 if the API ever surfaces mock errors verbatim.
- pnpm 12 requires build-script approval (`allowBuilds` in `pnpm-workspace.yaml`); listed packages
  are Prisma, esbuild, the ESLint resolver and the Nest CLI file watcher.
- Compose host ports default to 5432/5433; this machine uses 5440/5441 via `.env`.

## Phase 1 — auth, RBAC, SoD, audit, seed
_(pending)_

## Phase 2 — registry, revenue types, assessments, bulk upload
_(pending)_

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
