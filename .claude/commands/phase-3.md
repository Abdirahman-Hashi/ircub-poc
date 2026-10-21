---
description: Phase 3 — water accounts, meters, readings (single + CSV, rollover/replacement rules), tiered billing cycle, abnormal consumption, PDF bills, mock notifications, customer statements
---

Read `CLAUDE.md`, `docs/DECISIONS.md` (D13, D14, D19, D20) and `docs/PROGRESS.md`. This
phase implements brief **Module 4 (Water Utility Billing)**.

## Standards reminder (applies to every file in this phase)
`docs/ENGINEERING-STANDARDS.md` is enforced by lint and `/review`: every threshold, limit,
duration, code, prefix, job/event name, message and URL is a named constant, a
`SystemConfigKey` (for runtime-tunable business parameters — add key, typed default and
seed entry together), an env value, or a shared enum; every `interface`/`type`/`enum` is in
`*.types.ts`, `dto/*.dto.ts` or `packages/shared`; business rules are pure functions in
`*.rules.ts` with unit tests; external HTTP sits behind an injected interface; each new
module gets a `README.md`. Before committing, run `pnpm lint` and fix, do not disable rules.

## Prisma models to add
`TariffCategory` (code unique, name, fixedCharge Decimal), `TariffTier` (categoryId,
fromUnit int, toUnit int? null = open-ended, ratePerUnit Decimal, @@unique([categoryId,
fromUnit])), `WaterAccount` (accountNumber unique 'WA########', payerId, tariffCategoryId,
serviceAddress, status ACTIVE|DISCONNECTED, openedAt), `Meter` (serial unique, accountId,
maxDigits int default 6, initialReading int default 0, installedAt, status ACTIVE|REPLACED|
FAULTY, replacesMeterId?), `MeterReading` (meterId, readingDate, readingValue int, type
NORMAL|ROLLOVER|REPLACEMENT, consumption int, source MANUAL|CSV, capturedById, bulkUploadId?,
abnormal bool, abnormalReason?, @@unique([meterId, readingDate])), `BillingCycle` (period
'YYYY-MM' unique, status DRAFT|REVIEW|RELEASED, runById, runAt, releasedById?, releasedAt?,
stats json), `Bill` (billNumber unique = control number, cycleId, accountId, payerId,
periodStart, periodEnd, previousReading, currentReading, consumption, tierBreakdown json,
consumptionCharge, fixedCharge, arrears, paymentsApplied, totalDue, paidAmount default 0,
status DRAFT|FLAGGED|RELEASED|PART_PAID|PAID, flagged bool, flagReason?, pdfPath?, dueDate),
`Notification` (channel SMS|EMAIL, to, subject?, body, status QUEUED|SENT|FAILED,
relatedType?, relatedId?, sentAt?, error?). Add `Payment.billId?` FK. Register in
`audit.config.ts`.

## Backend
1. **Tariffs** CRUD (`config.manage`): categories + tiers; validate tiers are contiguous
   and non-overlapping starting at 0.
2. **Accounts & meters** (`meters.read` for readings; `payers.register` for account/meter
   create): create account for a payer, install meter, **replace meter** (`POST
   /meters/:id/replace { newSerial, initialReading, installedAt }` → old meter REPLACED,
   new meter `replacesMeterId`), lists with filters; payer 360° view now includes water
   accounts, meters, bills, balance.
3. **Readings**: `POST /readings { meterId, readingDate, readingValue, type }` and
   `POST /bulk-uploads/meter-readings` (CSV via the shared pipeline; columns
   `meter_serial, reading_date, reading_value, type`). Rules (D13) in one pure function
   `computeConsumption(previous, current, meter, type)` → `{ consumption } | throws
   READING_BELOW_PREVIOUS`; ROLLOVER consumption = `(10^maxDigits − previous) + current`;
   REPLACEMENT uses the new meter's `initialReading`. Abnormal flag: `consumption >
   threshold% (config, default 200) of mean(previous 3 monthly consumptions)`; store
   `abnormalReason` with the numbers. Reject duplicate reading for same meter/date.
   `GET /readings` filters: account, meter, date range, abnormal, source.
4. **Billing cycle** (`billing.run`): `POST /billing-cycles { period }` runs in a
   transaction per account (so one failure does not abort the cycle; collect errors):
   for each ACTIVE account with a reading in the period → bill per D14 with
   `tierBreakdown` `[ { from, to, units, rate, amount } ]`, arrears = sum of outstanding on
   previous bills, unallocated payments (payments with `billId = null` for this payer
   captured against the account? — simplify: payments reference a bill's control number,
   so "apply payments" = carry `paidAmount` of previous bills into arrears net of payments;
   record the assumption). Bills with an abnormal reading → `FLAGGED`. Cycle → `REVIEW`.
   `GET /billing-cycles/:id` returns stats `{ accounts, billed, flagged, skipped: [{
   accountNumber, reason }], totalBilled }` = the **exception report**.
   `POST /bills/:id/clear-flag { note }` / `POST /bills/:id/confirm-flag { note }`
   (`billing.release`; confirm keeps the bill held). `POST /billing-cycles/:id/release`
   (`billing.release`): refuses if any bill still FLAGGED; marks bills RELEASED, enqueues a
   pg-boss job per bill: render PDF (pdfkit, D19) to `STORAGE_DIR/bills/<billNumber>.pdf`,
   then POST mock `/sms` and `/email` via `MOCKS_BASE_URL`, record `Notification` rows.
   Re-running a period that is RELEASED is refused; DRAFT/REVIEW can be re-run (deletes
   its draft bills first).
5. **Bills & statements**: `GET /bills` (filters: cycle, account, payer, status, flagged),
   `GET /bills/:id`, `GET /bills/:id/pdf` (streams file; customers may fetch their own),
   `GET /water-accounts/:id/statement?from&to` → ordered lines of bills and payments with
   **running balance**, and `.../statement.pdf`. Phase 2's payment capture now resolves
   control numbers that belong to bills too (apply to `Bill.paidAmount`, status).
6. **Seed**: 2 tariff categories (DOMESTIC: 0–10 @ 0.50, 10–30 @ 0.90, 30–60 @ 1.40, 60+ @
   2.00 USD-equivalent in SOS; COMMERCIAL higher), ~120 accounts/meters for ~100 payers,
   12 months of readings with realistic seasonality, 2 rollover cases, 1 replacement,
   3 abnormal cases in the latest month; billing cycles for the last 3 months RELEASED
   (PDFs generated at seed time or lazily on first request — choose lazily and note it),
   current month not yet run. `docs/samples/meter-readings.sample.csv` (20 rows, 4 invalid
   incl. one below-previous and one valid rollover).

## Frontend
- Tariffs admin page (category + tier editor with validation).
- Water accounts list/detail (meters, readings chart, bills, statement with running
  balance, download PDF); meter replace dialog.
- Readings: single capture form (shows previous reading, computed consumption, abnormal
  warning), CSV upload via `CsvUploader`, readings list with abnormal filter.
- Billing cycles: run dialog → cycle page with stats cards, exception report table
  (flagged + skipped with reasons), flagged bills review (clear/confirm with note),
  release button (disabled while flagged remain) → notifications sent count with link to
  mocks `/outbox`.
- Customer portal: my water accounts, bills (PDF), statement.

## Tests (minimum)
Unit: tier calculation at boundaries (0, 10, 10.5 not applicable — ints, 30, 60, 500),
contiguity validation, `computeConsumption` for NORMAL/ROLLOVER/REPLACEMENT and the
below-previous rejection, abnormal flag at exactly 200 % (not flagged) and 201 % (flagged),
fewer than 3 history months, arrears carry-forward across two cycles, running balance.
E2E: CSV readings upload sample summary; run cycle → flagged bill blocks release → clear →
release → PDF endpoint returns `application/pdf` and a Notification row exists.

Commits: `feat(api): tariffs, water accounts, meters` · `feat(api): meter readings with rollover and abnormal detection` ·
`feat(api): billing cycle with tiered tariff, arrears, exception report` · `feat(api): bill pdf and mock notifications` ·
`feat(api): customer statements with running balance` · `feat(api): seed water data` ·
`feat(web): water billing screens` · `test(api): water billing rules` · `docs: phase 3 progress`
