# fmis

**Purpose.** Posting collections to the government FMIS and reconciling against its ledger
(brief Module 6; D11, D17): effective-dated GL mappings, one journal batch per day, an
idempotent poster job with retries, reversal batches, and payment → line → batch → FMIS
reference traceability.

**Rules.**

- `GlMappingsService.resolve(revenueTypeId, date)` picks the latest `effectiveFrom ≤ date`
  (`resolveMapping`). The revenue type's `glCode` is only the seed default; the mapping table
  is the source of truth. Codes are 4–6 digits.
- `JournalBatchService.buildForDate` selects, in one transaction, CONFIRMED payments with no
  `JournalLine` (relation filter = `LEFT JOIN … IS NULL`) paid on the UTC day **or within the
  previous `FMIS_CATCH_UP_DAYS` days** (`catchUp`, default on): a payment confirmed after its
  own day's batch went out (late callback, back-dated capture or bulk upload) is posted by
  the next build instead of never. It resolves the revenue type (assessment → its type; bill
  → `WATER`), writes a `PENDING` batch and one line per payment (debit cash control GL from
  `CASH_GL_CODE`, credit the revenue GL, amount = the payment's local amount, currency =
  `LOCAL_CURRENCY` even for USD payments). The unique `JournalLine.paymentId` and the partial
  unique index on one COLLECTIONS batch per day are the hard double-posting guard; a
  violation is reported as `DUPLICATE_POSTING` (409). No eligible payment → no batch
  (`null`). Cron `30 0 * * *` builds yesterday. The seed builds its history day by day
  without catch-up so each demo batch holds its own day.
- `FmisPosterService` (`fmis.post-batch`): POSTED or REVERSED → no-op; otherwise posts the
  payload (`toFmisPayload`: a debit entry and a credit entry per line, always balanced) with
  the batch id as idempotency key, stores `fmisReference`/`postedAt`; on error counts the
  attempt, keeps `lastError`, throws for pg-boss backoff and marks `FAILED` at
  `FMIS_POST_RETRY_LIMIT`. `POST /fmis/batches/:id/retry` re-enqueues a FAILED batch.
- Reversal approval (`onReversalApproved`): if the payment's line is in a POSTED batch, a
  `REVERSAL` batch for today gets the mirrored line (debit/credit swapped, amount positive,
  `reversalId` set) and is posted; the original batch becomes `REVERSED` only when all its
  lines are reversed (`statusAfterReversal`), else stays POSTED with per-line `reversed`
  flags. A line still PENDING/FAILED is simply dropped from its batch. Never-posted payments
  need nothing (REVERSED payments are not eligible).
- Reconciliation compares net credits per day and GL: IRCUB = credits − debits of POSTED
  lines (`netCreditByGl`), FMIS = ledger credit − debit; `MATCHED`, `MISMATCH` or
  `MISSING_IN_FMIS`. Ledger responses are cached 60 s; ranges are capped at 62 days.

**Endpoints.** `GET|POST /fmis/gl-mappings`, `DELETE /fmis/gl-mappings/:id`
(`gl_mappings.manage` to write); `POST /fmis/batches/build`, `/build-range`,
`/fmis/batches/:id/retry` (`fmis.post`); `GET /fmis/batches`, `/fmis/batches/:id`,
`/fmis/lines?paymentId|controlNumber`, `/fmis/reconciliation?from&to`,
`/fmis/reconciliation/export.csv`, `/fmis/reconciliation/:date/:glCode` (`fmis.view`).

**Testing.** Unit: `fmis.rules.spec.ts` (mapping resolution, line drafting, balanced payload,
attempt limit, reversal status rule, net credits, reconciliation verdicts, day helpers),
`fmis-poster.service.spec.ts` (idempotent on POSTED, retries → FAILED with lastError),
`journal-batch.service.spec.ts` (unique violation → DUPLICATE_POSTING, reversal batch and
original status). E2E: `test/fmis.e2e-spec.ts` with the in-process mocks.
