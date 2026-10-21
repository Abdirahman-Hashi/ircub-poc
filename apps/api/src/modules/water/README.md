# water

**Purpose.** Water utility billing (brief Module 4): tariff categories with tier bands,
accounts and meters (incl. replacement), readings with the D13 rules, monthly billing cycles
with the exception report (D14), bill PDFs (D19), mock notifications (D20) and customer
statements with a running balance.

**Rules.**

- Tiers: `[from, to)` bands starting at 0, contiguous, last open-ended (`tariffs.rules.ts`).
- Readings: NORMAL must not go backwards; ROLLOVER = `10^maxDigits − previous + current`;
  REPLACEMENT counts from the new meter's `initialReading`; one reading per meter per day;
  not in the future; abnormal when > `ABNORMAL_CONSUMPTION_THRESHOLD_PCT` of the mean of the
  previous `ABNORMAL_CONSUMPTION_HISTORY_MONTHS` (exactly 200 % is not flagged).
- Cycle: one per `YYYY-MM`; each ACTIVE account billed in its own transaction; no reading →
  skipped with a reason; abnormal reading → bill FLAGGED; arrears = unpaid remainder of
  earlier released bills; `totalDue = tiers + fixed + arrears`; status REVIEW. Release refuses
  while any bill is flagged (clear or confirm with a note first), then enqueues one job per
  bill: render PDF → SMS + email → `Notification` rows. RELEASED cycles cannot be re-run;
  DRAFT/REVIEW re-runs delete their draft bills (refused once a draft has payments).
- Bills take payments like assessments (same `applyPayment` rule, row locked); PDFs are
  rendered lazily on first request if missing (seeded cycles).

**Endpoints.** `tariffs`, `water-accounts` (+ `/statement`, `/statement.pdf`), `meters`
(+ `/replace`), `readings` (+ `/preview`), `bulk-uploads/meter-readings` (+ template),
`billing-cycles` (+ `/release`), `bills` (+ `/pdf`, `/clear-flag`, `/confirm-flag`).
Permissions: `bills.view`, `meters.read`, `billing.run`, `billing.release`,
`payers.register` (accounts/meters), `config.manage` (tariffs).

**Testing.** Unit: `tariffs.rules.spec.ts`, `readings.rules.spec.ts`, `billing.rules.spec.ts`,
`statements.rules.spec.ts`, `bills.rules.spec.ts`. E2E: `test/water-billing.e2e-spec.ts`.
