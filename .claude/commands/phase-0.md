---
description: Phase 0 — monorepo scaffold, Docker Compose, Prisma, tooling
---

Read `CLAUDE.md`, `docs/DECISIONS.md` and `docs/PROGRESS.md` first. Then scaffold the
repository exactly as laid out in `CLAUDE.md`. Do not implement business features in this
phase — only the skeleton that every later phase builds on.

## Deliverables

1. **Workspace**
   - `pnpm-workspace.yaml` (`apps/*`, `packages/*`), root `package.json` with scripts:
     `dev` (concurrently api, mocks, web), `build`, `test`, `test:e2e`, `lint`, `typecheck`,
     `format`, `prepare` (husky).
   - Root `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
     ES2022, path alias `@ircub/shared`), Prettier, `.editorconfig`, `.gitignore`, `.nvmrc`
     (Node 20 LTS), `.env.example` (every variable commented).
   - **ESLint flat config enforcing `docs/ENGINEERING-STANDARDS.md`:** typescript-eslint
     strict + stylistic; `@typescript-eslint/no-explicit-any: error`;
     `@typescript-eslint/no-magic-numbers` (`ignore: [0, 1, -1]`, `ignoreEnums`,
     `ignoreReadonlyClassProperties`, `ignoreTypeIndexes`, off for `*.spec.ts`, `*.constants.ts`,
     `seed/**`); `@typescript-eslint/consistent-type-definitions: ['error','interface']`;
     `no-restricted-syntax` flagging `TSInterfaceDeclaration`, `TSTypeAliasDeclaration`,
     `TSEnumDeclaration` outside files matching `*.types.ts|*.dto.ts|*.constants.ts|*.keys.ts|
     *.payloads.ts|enums.ts|permissions.ts|roles.ts|error-codes.ts|*.spec.ts|*.schema.ts`;
     `import/no-cycle`, `import/order` (groups, alphabetised); `eslint-plugin-unicorn`
     `no-array-for-each` and `filename-case` (kebab) are optional. `pnpm lint` must fail on
     violations — verify with a deliberate magic number before removing it.
   - **Hooks & commits:** `husky` + `lint-staged` (eslint --fix, prettier on staged),
     `@commitlint/config-conventional` on `commit-msg`.
   - **CI:** `.github/workflows/ci.yml` — on push/PR: pnpm install (cached), lint, typecheck,
     unit tests, e2e tests against a `postgres:16` service container, `docker build` of the
     three images. Add the CI badge to README.
2. **packages/shared** — `src/index.ts` exporting `permissions.ts` (all codes from
   `apps/api/CLAUDE.md`, as a const object + union type + grouped list for the admin UI),
   `enums.ts` (PaymentStatus, PaymentChannel, Currency, AssessmentStatus, BillStatus,
   BillingCycleStatus, JournalBatchStatus, ReadingType, PayerType, ReconciliationLineStatus,
   AlertType), `roles.ts` (the six built-in role codes), `error-codes.ts` (`ErrorCode` enum,
   seeded with the codes named across the phase prompts), `constants/` (identifiers:
   TIN/control-number format constants; pagination defaults; CSV templates), and
   `types/` (empty index for now; later phases add per-domain contract types). No runtime
   dependencies.
3. **apps/api** — NestJS app with: `ConfigModule` + zod env schema in
   `config/env.schema.ts` (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`,
   `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`, `MOCKS_BASE_URL`, `MOCK_SHARED_SECRET`,
   `API_PUBLIC_URL`, `PORT`, `CORS_ORIGIN`, `STORAGE_DIR`, `LOG_LEVEL`, `NODE_ENV`) exposed
   through a typed `AppConfigService` (no `process.env` reads elsewhere); `PrismaModule`
   with `PrismaService` (graceful shutdown); `SystemConfigModule` skeleton
   (`system-config.keys.ts` with `SystemConfigKey` enum + typed defaults map, `get<K>()`
   generic over the key, 30 s in-memory cache, model `SystemConfig`);
   `GlobalExceptionFilter` + `AppException(ErrorCode, …)`; request-id middleware
   (`x-request-id`, AsyncLocalStorage context) and structured logging (Nest `Logger` with
   JSON formatter in production; `nestjs-pino` acceptable); `ValidationPipe` as specified;
   helmet, cookie-parser, CORS, `@nestjs/throttler` registered (limits from constants);
   Swagger at `/docs` with a bearer scheme; `GET /health` (liveness) and `GET /ready`
   (DB + pg-boss) returning `{ status, checks, version }`; `pg-boss` module (`JobsModule`)
   with `job-names.ts` and `job-payloads.ts`, exposing a typed `enqueue<J extends JobName>(name,
   payload: JobPayload[J], opts)`; `EventBus` + `GET /events` SSE endpoint with
   `event-names.ts` and `event-payloads.ts` (authenticated later; for now `@Public()`);
   `@nestjs/schedule` registered. Every module directory gets a 10–20 line `README.md`
   (purpose, rules, endpoints, how to test) — create the template now.
   Prisma schema with **only** the foundation enums (from shared) and a `ControlNumber`
   sequence table — business models come in later phases. Add `prisma/seed.ts` skeleton
   (`@faker-js/faker` with `faker.seed(42)`), `prisma/seed/` folder, and the
   `"prisma": { "seed": … }` config. Jest configured for unit + e2e (`test/jest-e2e.json`),
   one passing unit test (`AppException` shape) and one e2e test (`/health`).
   Script `openapi:export` that boots the app, writes `docs/openapi.json`, exits.
4. **apps/mocks** — NestJS app on port 3100 with `/health`, Swagger at `/docs`, the
   in-memory `StoreService`, `POST /__reset`, and `GET /rates` fully implemented
   (per `apps/mocks/CLAUDE.md`). Other endpoints come in phase 4/5. One unit test.
5. **apps/web** — Vite + React + TS, Mantine (`@mantine/core`, `hooks`, `form`,
   `notifications`, `dates`), mantine-react-table, TanStack Query + Router, react-hook-form,
   zod, Recharts, `@ircub/shared` alias. `AppShell` with placeholder nav from `app/nav.ts`
   (permission codes attached, filter wired to a stubbed `useCan` returning true), `lib/api.ts`
   fetch wrapper (base URL from `VITE_API_URL`, bearer header, 401 → refresh → retry once),
   `/health`-driven "API is waking up…" overlay, and a `/login` placeholder page. Vitest
   configured with one passing test. `nginx.conf` for the production image: serve `dist`,
   proxy `/api/*` to the api service, SPA fallback.
6. **Docker** — Dockerfiles (multi-stage, pnpm, non-root) for api, mocks, web;
   `docker-compose.yml` with `postgres:16-alpine` (healthcheck, volume), `api` (runs
   `prisma migrate deploy && node dist/main`), `mocks`, `web` (nginx :8080→80);
   `docker-compose.test.yml` with a throwaway postgres on 5433 for e2e. `storage/` volume
   for api.
7. **Docs** — `README.md` first version: title, one-paragraph description, stack, prerequisites,
   local setup commands, Compose commands, test commands, an empty "Assumptions" and "Known
   limitations" section, and the **AI assistance declaration** paragraph.
   `docs/PROGRESS.md` phase 0 section filled in.

## Acceptance
- `pnpm install && pnpm typecheck && pnpm lint && pnpm test` all pass.
- Lint **fails** on: a magic number in a service, an `interface` declared in a `*.service.ts`,
  an `any`. Prove each once, then remove the probe. A commit message `wip` is rejected.
- `grep -rn "process.env" apps/api/src --include=*.ts` returns only `config/env.schema.ts`.
- `docker compose up -d postgres && pnpm --filter api prisma migrate dev --name init` works.
- `pnpm dev` starts three apps; `GET :3000/health` shows `db: up`; `GET :3100/rates` returns
  rates; web shows the shell at `:5173`.
- `docker compose up --build` brings up all four services; `http://localhost:8080` serves the SPA
  and `http://localhost:8080/api/health` proxies to the API.

## Commits (suggested)
`chore: init pnpm monorepo, lint, prettier, tsconfig` · `chore: husky, lint-staged, commitlint, ci workflow` ·
`feat(shared): permission codes, enums, error codes, constants` ·
`feat(api): nest skeleton with config, prisma, errors, swagger, health` · `feat(api): pg-boss jobs module and SSE event bus` ·
`feat(mocks): skeleton with FX rates endpoint` · `feat(web): vite react mantine shell with api client` ·
`chore: dockerfiles and docker compose` · `docs: initial README and progress log`

Finish with the phase report appended to `docs/PROGRESS.md`.
