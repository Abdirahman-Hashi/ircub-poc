---
description: Phase 5 — FMIS GL mapping, automatic daily journal batches, idempotent posting to mock FMIS with stored reference, reversal batches, IRCUB-vs-FMIS reconciliation with drill-down
---

Read `CLAUDE.md`, `docs/DECISIONS.md` (D11, D17), `apps/mocks/CLAUDE.md` and
`docs/PROGRESS.md`. This phase implements brief **Module 6 (FMIS Posting &
Reconciliation)**. The grader will look for: configurable mapping, automatic daily
batches with the four statuses, stored FMIS reference, **no double posting**, and full
traceability payment → journal line → batch → FMIS reference.

## Standards reminder (applies to every file in this phase)
`docs/ENGINEERING-STANDARDS.md` is enforced by lint and `/review`: every threshold, limit,
duration, code, prefix, job/event name, message and URL is a named constant, a
`SystemConfigKey` (for runtime-tunable business parameters — add key, typed default and
seed entry together), an env value, or a shared enum; every `interface`/`type`/`enum` is in
`*.types.ts`, `dto/*.dto.ts` or `packages/shared`; business rules are pure functions in
`*.rules.ts` with unit tests; external HTTP sits behind an injected interface; each new
module gets a `README.md`. Before committing, run `pnpm lint` and fix, do not disable rules.

## Prisma models to add
`GlMapping` (revenueTypeId, glCode, glName, effectiveFrom date, createdById,
@@unique([revenueTypeId, effectiveFrom])), `JournalBatch` (id uuid, batchDate date,
kind COLLECTIONS|REVERSAL, status PENDING|POSTED|FAILED|REVERSED, lineCount, totalLocal,
fmisReference?, postedAt?, attempts int, lastError?, reversedByBatchId?, createdAt,
@@unique([batchDate, kind]) for COLLECTIONS only — enforce in code for REVERSAL),
`JournalLine` (batchId, paymentId unique, reversalId?, revenueTypeId, glCode, debitGl
(cash/bank control GL, config `cashGlCode` default '1010'), creditGl = glCode, amount
Decimal (local), currency 'SOS', reference = controlNumber). Register in `audit.config.ts`.

## Mocks app
Implement `POST /fmis/journals` (idempotent on `batchId`, balance validation, `?fail=1`
and `date` ending `13` failure) and `GET /fmis/ledger?date=` per `apps/mocks/CLAUDE.md`.
Unit tests.

## API
1. **GL mappings** (`gl_mappings.manage` / `fmis.view`): CRUD with effective dating;
   `GlMappingService.resolve(revenueTypeId, onDate)` picks the latest `effectiveFrom ≤
   date`; seed from `RevenueType.glCode` (the revenue type keeps `glCode` as a default;
   mapping table overrides — state this). Validation: GL code format `^\d{4,6}$`.
2. **Batch builder** (`JournalBatchService.buildForDate(date)`): in one transaction,
   select `CONFIRMED` payments with `paidAt` on `date` that have **no** `JournalLine`
   (`LEFT JOIN … IS NULL`), resolve revenue type (assessment → revenueType; bill → WATER),
   resolve GL, create batch `PENDING` + lines; `JournalLine.paymentId` unique constraint is
   the hard guarantee against double posting — catch the unique violation and report it
   as `DUPLICATE_POSTING`. If no eligible payments → no batch (return `null`). Cron 00:30
   daily for yesterday; `POST /fmis/batches/build { date }` (`fmis.post`) for manual/
   backfill; `POST /fmis/batches/build-range { from, to }` for seed/demo.
3. **Poster** (pg-boss job `fmis.post-batch`, `retryLimit: 3`, backoff): load batch;
   if already `POSTED` → no-op (idempotent); build payload per D17/ASSUMPTIONS (debit cash
   GL, credit revenue GL per line; the mock validates balance); POST to mocks
   `/fmis/journals` with `batchId` as idempotency key; store `fmisReference`, `POSTED`,
   `postedAt`; on error → `attempts++`, `lastError`, status `FAILED` when retries are
   exhausted; `POST /fmis/batches/:id/retry` (`fmis.post`) re-enqueues a FAILED batch.
   Enqueue automatically after build. SSE `fmis.batch.updated`.
4. **Reversals → FMIS**: when a reversal is **approved** (phase 2 hook) for a payment whose
   line is in a `POSTED` batch, create a `REVERSAL` batch for today with a mirrored line
   (`reversalId` set, negative or swapped debit/credit — choose swapped and note), post
   it, and mark the original batch `REVERSED` only if **all** its lines are reversed;
   otherwise keep `POSTED` and expose per-line `reversed` flag. If the payment was never
   posted, simply exclude it (status `REVERSED` payments are not eligible for building).
5. **Traceability**: `GET /fmis/batches` (filters: date range, status, kind), `GET
   /fmis/batches/:id` (lines with payment, payer, control number, revenue type, GL),
   `GET /payments/:id` now includes `journalLine { batchId, batchStatus, fmisReference }`,
   `GET /fmis/lines?paymentId|controlNumber`.
6. **Reconciliation screen** (`fmis.view`): `GET /fmis/reconciliation?from&to` →
   per `(date, glCode)`: `ircubTotal` (sum of POSTED lines), `fmisTotal` (from mocks
   `/fmis/ledger?date=`), `difference`, `status MATCHED|MISMATCH|MISSING_IN_FMIS`;
   drill-down `GET /fmis/reconciliation/:date/:glCode` → lines → payments. Cache FMIS
   ledger responses for 60 s. Export CSV.
7. **Seed**: GL mappings for all revenue types (incl. WATER); build + post batches for the
   last 30 days via the mocks when reachable (`build-range`), leave the two most recent
   days PENDING/FAILED for the demo (use the `13` trigger or `?fail=1` for one), plus one
   REVERSAL batch. If mocks are unreachable at seed time, create batches as PENDING and
   note it in PROGRESS.

## Frontend
- GL mappings admin page (effective-dated rows per revenue type).
- FMIS batches list (status badges, counts, totals, FMIS reference, attempts, last error),
  batch detail with lines table → click payment → payment drawer (full chain visible);
  "Build for date", "Retry" buttons.
- FMIS reconciliation page: date range → matrix/table per day × GL with totals and
  difference highlighted → drill-down drawer to lines → payments; export.
- Payment detail now shows the journal/FMIS section.

## Tests (minimum)
Unit: GL resolution with effective dates, batch builder excludes already-posted and
REVERSED payments, unique violation mapped to `DUPLICATE_POSTING`, poster idempotent on
POSTED batch, retries → FAILED with `lastError`, reversal batch creation and original batch
status rule, reconciliation classification. E2E (with mocks): build → post → reference
stored; calling build again for the same date creates no new lines; posting the same batch
twice returns the same reference; `13`-day batch fails and retry succeeds after
`__scenario`/flag cleared.

Commits: `feat(mocks): fmis journals and ledger` · `feat(api): gl mappings with effective dating` ·
`feat(api): daily journal batch builder with double-posting guard` · `feat(api): fmis poster job with retries and reference storage` ·
`feat(api): reversal batches and traceability endpoints` · `feat(api): fmis reconciliation` ·
`feat(web): fmis batches, mappings, reconciliation` · `test(api): fmis posting and reconciliation` · `docs: phase 5 progress`
