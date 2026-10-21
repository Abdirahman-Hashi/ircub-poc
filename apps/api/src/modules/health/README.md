# health

**Purpose.** Separate liveness and readiness probes for Docker Compose, Render and the web
app's "API is waking up…" overlay.

**Rules.**

- `GET /health` never touches the database: it only proves the process is up.
- `GET /ready` checks Postgres (`SELECT 1`, with latency) and that pg-boss has started;
  returns 503 with per-check detail when anything is down.
- Both are `@Public()` and excluded from access logs (`LOG_IGNORED_PATHS`).

**Endpoints.** `GET /health`, `GET /ready` → `{ status, checks, version, timestamp }`.

**Testing.** e2e: `test/health.e2e-spec.ts` boots the app against the test database.
