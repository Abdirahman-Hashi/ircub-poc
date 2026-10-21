# Build workflow (for the candidate)

## One-time setup
```bash
# prerequisites: Node 20 LTS, pnpm 9 (corepack enable && corepack prepare pnpm@latest --activate), Docker Desktop, git
git clone <your-repo-url> ircub-poc && cd ircub-poc
# copy this starter kit's files into the clone (CLAUDE.md, .claude/, docs/, apps/*/CLAUDE.md) if not already there
git add -A && git commit -m "chore: project instructions, decision log, phase prompts"
claude
```

## Running the phases
Inside Claude Code, in order:
```
/phase-0      ~45–60 min   scaffold, compose, prisma, tooling
/phase-1      ~60–90 min   auth, rbac, sod, audit, seed
/phase-2      ~60–90 min   registry, assessments, bulk upload, reversals
/phase-3      ~60–90 min   water billing
/phase-4      ~60–90 min   mocks, payments, retries, channel recon
/phase-5      ~45–60 min   fmis
/phase-6      ~45–60 min   dashboard, forecast, alerts
/review       ~15 min      gap report (read it, then ask Claude to fix the P0/P1 items)
/phase-7      ~60 min      deliverables, compose verification, render/neon files
/review       ~15 min      final confirmation
```
Timings are rough and assume you review between phases. Expect the whole run to take
the working day; tomorrow is for refinement, screenshots and the hosted deploy.

## Between phases — your checklist (5 minutes each)
1. `git log --oneline -15` — commits read like a story, no `wip`.
2. `pnpm test` green; skim the test names — they are your talking points in the interview.
3. Open the new screens as two different seeded users; try one forbidden action.
4. Read `docs/PROGRESS.md` latest section and `docs/ASSUMPTIONS.md` additions; edit any
   assumption you disagree with **before** the next phase builds on it.
5. Read every new service file once. If you cannot explain a function, ask Claude to
   simplify it or add a comment explaining *why* — "must be able to explain every line".

## If a phase goes wrong
- Context getting long → finish the current module, commit, run `/compact`, continue with
  the same `/phase-N` command; it re-reads `docs/PROGRESS.md` and picks up.
- A phase stops asking a question → answer it; if unsure, say "take the simplest reading
  that satisfies the brief and record the assumption".
- Tests failing at the end of a phase → do not move on; ask "fix the failing tests
  without weakening assertions".
- Schema change needed later → always a new Prisma migration, never edit old ones.

## Deploy day (tomorrow)
1. Create Neon project → copy `DATABASE_URL` (pooled, `sslmode=require`).
2. Create Render account (GitHub login) → New → Blueprint → select repo → `render.yaml`
   → fill env vars (`docs/DEPLOYMENT.md` has the list) → deploy.
3. Seed once (Render shell: `pnpm --filter api prisma db seed`).
4. Open the web URL, log in as `admin@ircub.test`, run the `.99 / .77 / .66` payment
   scenarios, check mocks `/outbox`, screenshot for README.
5. Put the hosted URL in the README "Demo links" and in the submission form.

## Submission checklist (from the brief)
- [ ] Repo link with meaningful commit history
- [ ] README: setup, stack, assumptions, known limitations, AI declaration
- [ ] ERD (`docs/erd.svg`) + seed scripts (`apps/api/prisma/seed`)
- [ ] OpenAPI (`docs/openapi.json`, `/docs`) + Postman (`docs/postman/`)
- [ ] Tests + instructions (`pnpm test`, README "Running tests")
- [ ] Docker Compose (`docker compose up --build`) **and** hosted demo link
