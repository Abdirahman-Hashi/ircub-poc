---
description: Phase 4 — mock bank/mobile-money/FX services, multi-currency payment initiation, signed callbacks, status-check retries with permanent failure + supervisor notification, daily channel reconciliation, live status via SSE
---

Read `CLAUDE.md`, `docs/DECISIONS.md` (D9, D15, D16), `apps/mocks/CLAUDE.md` and
`docs/PROGRESS.md`. This phase implements brief **Module 5 (Payment Channel Integration)**.

## Standards reminder (applies to every file in this phase)
`docs/ENGINEERING-STANDARDS.md` is enforced by lint and `/review`: every threshold, limit,
duration, code, prefix, job/event name, message and URL is a named constant, a
`SystemConfigKey` (for runtime-tunable business parameters — add key, typed default and
seed entry together), an env value, or a shared enum; every `interface`/`type`/`enum` is in
`*.types.ts`, `dto/*.dto.ts` or `packages/shared`; business rules are pure functions in
`*.rules.ts` with unit tests; external HTTP sits behind an injected interface; each new
module gets a `README.md`. Before committing, run `pnpm lint` and fix, do not disable rules.

## Prisma models to add / extend
`FxRate` (base, quote, rate Decimal(18,6), asOf, source) — keep history, index on asOf.
`ChannelStatement` (channel, statementDate, fileName, storedPath, lineCount, importedById?),
`ChannelStatementLine` (statementId, txnRef, date, amount, currency, controlNumber, status),
`ReconciliationRun` (channel, runDate, status, matched, missingInIrcub, missingInChannel,
amountMismatch, runById?), `ReconciliationLine` (runId, status MATCHED|MISSING_IN_IRCUB|
MISSING_IN_CHANNEL|AMOUNT_MISMATCH, paymentId?, statementLineId?, ircubAmount?,
channelAmount?, note?). Extend `Payment` with `channelRequestPayload json?`,
`lastStatusCheckAt?`, `permanentlyFailedAt?`.

## Mocks app — implement the remaining endpoints exactly per `apps/mocks/CLAUDE.md`
Bank and mobile money (payments, status, statements with `perturb`), HMAC-signed delayed
callbacks, scenario triggers (`.99`, `.77`, `.66`, `__scenario`), `/sms`, `/email`,
`/outbox`. Unit tests for signing, triggers, statement perturbation.

## API
1. **FX** (`modules/fx`): `FxService.getRate(base, quote)` fetches `MOCKS_BASE_URL/rates`,
   stores an `FxRate` row, falls back to the latest stored rate if the mock is down (log a
   warning, flag `stale: true`). Cron every 15 min refreshes. `GET /fx/latest`, `GET
   /fx/history`. Conversion helper in `common/money`: `toLocal(amount, currency) → {
   localAmount, fxRate, fxRateAt }` using HALF_EVEN at 2 dp.
2. **Channels** (`modules/channels`): `ChannelClient` interface `{ initiate, status,
   statement }` with `BankChannelClient` and `MomoChannelClient` (both HTTP to mocks,
   10 s timeout, errors mapped to `CHANNEL_UNAVAILABLE`). Registry keyed by
   `PaymentChannel`.
3. **Payment initiation** (`payments.capture` for officers; `self.pay` for customers on
   their own control numbers): `POST /payments/initiate { controlNumber, amount, currency,
   channel BANK|MOBILE_MONEY, payerPhone? }` → validate target (assessment or bill,
   outstanding, currency), convert to local, create `Payment` `INITIATED`, call channel
   `initiate` with `callbackUrl = API_PUBLIC_URL/payments/callback/<channel>`, store
   `channelTxnRef`, set `PENDING`, enqueue pg-boss job `payment.status-check` with
   `startAfter: 60s`, `retryLimit: 3`, `retryBackoff: true`. Emit SSE `payment.updated`.
4. **Callback** `POST /payments/callback/:channel` (`@Public()`): verify `X-Signature`
   HMAC with `MOCK_SHARED_SECRET` (constant-time compare) → 401 `INVALID_SIGNATURE`; find
   payment by `(channel, txnRef)` → 404; if already terminal → 200 `{ duplicate: true }`
   (idempotent); verify amount/currency match → else `FAILED` with reason; SUCCESS → apply
   payment (shared `PaymentApplicationService` from phase 2/3) in a transaction, status
   `CONFIRMED`, `paidAt`; FAILED → `FAILED`. Cancel the pending status-check job if
   possible (or make the job a no-op when terminal). Emit SSE.
5. **Status-check job** (`payment.status-check`): if payment not `PENDING` → done. Call
   channel `status`; SUCCESS/FAILED → same handling as callback; PENDING or error →
   increment `statusCheckAttempts`, throw to let pg-boss retry (max 3). On final failure
   (pg-boss `retryLimit` exhausted — use the `failed` event or a wrapper that checks
   `attempts >= 3`): set `PERMANENTLY_FAILED`, `permanentlyFailedAt`, create
   `Notification` (mock email) to every user holding `payments.supervise`, create an
   `Alert` row? (Alert model arrives in phase 6 — for now emit SSE `payment.permanently-
   failed` and log; phase 6 will add the Alert). The brief says "retry up to 3 times" —
   make the limit a config value `paymentStatusRetryLimit` default 3 and test it.
6. **Live status**: `GET /events` SSE now authenticated; the web subscribes and updates
   the payments table/row and shows toasts. Customers receive only their own payment events
   (filter by payerId server-side).
7. **Channel reconciliation** (`reconciliation.run` / `.view`): `POST /reconciliation/runs
   { channel, date }` → fetch statement CSV from the channel (`statement(date)`), store
   file + lines, match against IRCUB payments of that channel/date on `channelTxnRef`,
   produce lines per D16 (amount compare on `amount` in original currency), summary
   counts. Daily cron 01:00 for yesterday, both channels. `GET /reconciliation/runs`,
   `GET /reconciliation/runs/:id` (lines with filter by status), `GET
   /reconciliation/runs/:id/export.csv`. Also allow uploading a statement file manually
   (`POST /reconciliation/statements` multipart) for the "statement file" wording.
8. **Payments list** now includes channel/currency/fx columns and the filters from the
   brief; `GET /payments/:id` shows the channel request/callback payloads (auditor view).
9. **Seed**: ~300 additional BANK/MOBILE_MONEY payments over the last 60 days with
   `channelTxnRef`s that the mock statements will "know" — simplest: the mock's statement
   endpoint accepts an optional `POST /bank/statements/seed` from the API seed, or the
   recon demo uses only payments made live. Choose: add `POST /__seed-statement` to mocks
   and call it from the API seed when `MOCKS_BASE_URL` is reachable; otherwise skip and
   note. Also 2 `PERMANENTLY_FAILED` and 3 `FAILED` payments seeded.

## Frontend
- Payment initiation dialog (officer: from assessment/bill; customer: from `/me`): choose
  channel + currency, show live converted amount and rate, submit → row shows PENDING with
  spinner, flips to CONFIRMED/FAILED via SSE without refresh.
- Payments list: status badges incl. PERMANENTLY_FAILED, filters, detail drawer with
  payloads and status-check attempts timeline.
- Supervisor notifications panel (bell): permanently failed payments.
- FX page: latest rate, history chart (Recharts), "stale" indicator.
- Reconciliation: run dialog (channel + date), runs list, run detail with summary cards and
  lines table filterable by status, export CSV, upload statement file.
- Demo helper page `/demo` (admin only): explains the `.99/.77/.66` scenario amounts and
  links to mocks `/outbox`.

## Tests (minimum)
Unit: HMAC verify (valid, tampered body, wrong secret), callback idempotency (second
callback is a no-op), amount mismatch → FAILED, FX conversion rounding (HALF_EVEN cases),
stale-rate fallback, retry counter reaches limit → PERMANENTLY_FAILED + notification
recipients = users with `payments.supervise`, reconciliation classification for all four
statuses. E2E (against running mocks via `docker-compose.test.yml` adding the mocks
service, or an in-process Nest test app for mocks): initiate `.00` → callback → CONFIRMED;
initiate `.66` → after 3 failed checks → PERMANENTLY_FAILED (shorten delays via env in
test); recon run on a perturbed statement yields 1 missing-in-IRCUB, 1 missing-in-channel,
1 mismatch.

Commits: `feat(mocks): bank, mobile money, fmis-ready store, notifications, scenarios` ·
`feat(api): fx rates service with fallback` · `feat(api): payment initiation via channel clients` ·
`feat(api): signed idempotent payment callbacks` · `feat(api): status-check retries and permanent failure notification` ·
`feat(api): channel reconciliation runs and reports` · `feat(web): online payments, live status, fx, reconciliation` ·
`test(api): payments, retries, reconciliation` · `docs: phase 4 progress`
