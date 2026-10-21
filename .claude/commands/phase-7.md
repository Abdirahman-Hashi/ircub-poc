---
description: Phase 7 — submission deliverables: test sweep, OpenAPI + Postman, ERD, seed scripts, README (stack, setup, assumptions, limitations, AI declaration), Docker Compose verification, Render + Neon deployment files
---

Read `CLAUDE.md`, `docs/DECISIONS.md` (D21–D26), `docs/ASSUMPTIONS.md`, `docs/PROGRESS.md`
and `docs/BRIEF.md` "POC Submission Deliverables". Run `/review` first if it has not been
run since phase 6. This phase produces everything the panel will open first.

## Standards reminder (applies to every file in this phase)
`docs/ENGINEERING-STANDARDS.md` is enforced by lint and `/review`: every threshold, limit,
duration, code, prefix, job/event name, message and URL is a named constant, a
`SystemConfigKey` (for runtime-tunable business parameters — add key, typed default and
seed entry together), an env value, or a shared enum; every `interface`/`type`/`enum` is in
`*.types.ts`, `dto/*.dto.ts` or `packages/shared`; business rules are pure functions in
`*.rules.ts` with unit tests; external HTTP sits behind an injected interface; each new
module gets a `README.md`. Before committing, run `pnpm lint` and fix, do not disable rules.

## 1. Quality sweep
- `pnpm lint`, `pnpm typecheck`, `pnpm test` all green; fix rather than skip. Remove dead
  code, `console.log`, TODOs that are not real limitations.
- Walk every "Output" bullet in `docs/BRIEF.md` and confirm a screen or endpoint satisfies
  it; list any gap in README "Known limitations" honestly.
- Add missing `@ApiOperation`/`@ApiResponse`/examples so Swagger reads well; ensure error
  responses document the `code` field.
- Check every list endpoint supports pagination + the filters named in the brief.
- Run `GET /audit/verify` on the seeded DB → ok.

## 2. API documentation
- `pnpm --filter api openapi:export` → `docs/openapi.json` (committed).
- Generate `docs/postman/IRCUB.postman_collection.json` with `openapi-to-postmanv2`
  (script `pnpm postman:export`); add `docs/postman/IRCUB.postman_environment.json`
  (`baseUrl`, `accessToken`) and a short `docs/postman/README.md` explaining the
  login → token flow (pre-request script that logs in as admin and stores the token).
- Swagger UI at `/docs` documented in README.

## 3. ERD and seed
- `prisma-erd-generator` → `docs/erd.md` (Mermaid) and `docs/erd.svg`; include a
  hand-written `docs/data-model.md` with one paragraph per bounded context and the key
  invariants (unique constraints that enforce idempotency, SoD rule, audit chain).
- Make sure `pnpm --filter api prisma db seed` is idempotent (truncate + reseed) and
  documented, and `docs/samples/*.csv` are referenced from README with what each row
  demonstrates.

## 4. README.md (final)
Sections, in order: Title + one-paragraph summary · Demo links (hosted URL, Swagger,
mocks outbox) · Screenshots (take 6–8 with Playwright or manually: login, dashboard,
assessments with filters, bulk upload summary, billing cycle exception report, payment
live status, FMIS reconciliation, audit verify) saved to `docs/screenshots/` · Technology
stack (table, with one-line justification each) · Architecture overview (diagram: web →
api → postgres; api ↔ mocks; jobs; SSE — Mermaid) · Getting started (prereqs, Compose
one-liner, local dev, seed users table, demo scenario amounts `.99/.77/.66`) · Running
tests · Module-by-module walkthrough mapping brief requirements → where implemented
(table: requirement · endpoint/screen · test) · Assumptions (copied from
`docs/ASSUMPTIONS.md`) · Known limitations · Security notes (what's done, what a
production system would add) · **AI assistance declaration** (Claude Code used for
scaffolding, boilerplate, tests and documentation under the candidate's direction; all code
reviewed and understood by the candidate; list of phases) · Licence/author.

## 5. Docker Compose verification
From a clean clone: `docker compose up --build` → wait for health → `curl
localhost:8080/api/health` → log in in the browser → seed is applied (api container runs
`prisma migrate deploy && prisma db seed` on first boot guarded by a marker row) → run one
payment with the mocks → confirm callback flows across containers (`API_PUBLIC_URL` must be
the api container hostname for the mocks). Fix anything that only worked in `pnpm dev`.

## 6. Hosted demo (Render + Neon)
- `render.yaml` blueprint: `api` (Docker, env from a group: `DATABASE_URL` → Neon,
  secrets generated), `mocks` (Docker), `web` (static site: build `pnpm --filter web
  build`, publish `apps/web/dist`, rewrite `/api/*` → api URL, SPA fallback). Health check
  paths set. `API_PUBLIC_URL` = the Render api URL; `MOCKS_BASE_URL` = Render mocks URL;
  `CORS_ORIGIN` = web URL.
- Neon: `DATABASE_URL` with `sslmode=require`; pg-boss schema creation works on Neon
  (verify); migrations run on deploy (`prisma migrate deploy` in the api start command);
  seed via a one-off `pnpm --filter api prisma db seed` from the Render shell or a
  `SEED_ON_BOOT=true` env guarded by the marker row.
- Document in README: cold start ~1 min, crons run only while awake, how to wake (open the
  URL), and the Compose path as the primary evaluation route.
- Write `docs/DEPLOYMENT.md` with the exact click-path for Render and Neon so the
  candidate can execute it (they will create the accounts right before deploying).

## 7. Git hygiene
`git log --oneline` should read as a build story across phases. Tag `v0.1.0-poc`. Ensure
no secrets committed (`.env` ignored, `.env.example` complete). Final commit:
`docs: final README, deliverables, deployment blueprint`.

Finish with the phase report in `docs/PROGRESS.md` including: test counts (unit/e2e/web),
list of brief requirements with status (done / partial / not done), and the submission
checklist from the brief ticked.
