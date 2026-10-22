# water

**Purpose.** Water utility billing (brief Module 4): tariff categories with tier bands,
accounts and meters (incl. replacement), readings with the D13 rules, monthly billing cycles
with the exception report (D14), bill PDFs (D19), mock notifications (D20) and customer
statements with a running balance.

**Rules.**

- Tiers: `[from, to)` bands starting at 0, contiguous, last open-ended (`tariffs.rules.ts`).
- Readings: NORMAL must not go backwards; ROLLOVER = `10^maxDigits − previous + current` and
  is only accepted when the dial actually wrapped (current below previous, within capacity);
  REPLACEMENT counts from the new meter's `initialReading`, and the swap can record a closing
  reading on the old meter in the same transaction; one reading per meter per day;
  not in the future; abnormal when > `ABNORMAL_CONSUMPTION_THRESHOLD_PCT` of the mean of the
  previous `ABNORMAL_CONSUMPTION_HISTORY_MONTHS` (exactly 200 % is not flagged).
- Cycle: one per `YYYY-MM`; each ACTIVE account billed in its own transaction; no reading →
  skipped with a reason; abnormal reading → bill FLAGGED; arrears = the account's outstanding
  balance = Σ own charges − Σ payments over earlier released bills (never Σ `totalDue`, which
  already contains earlier arrears); `totalDue = tiers + fixed + arrears`; status REVIEW.
  Release refuses while a flagged bill is unreviewed; a **cleared** flag goes out with the
  cycle, a **confirmed** flag is held back (`stats.held`) and goes out on its own when it is
  later cleared. Release enqueues one job per bill: render PDF → SMS + email →
  `Notification` rows. RELEASED cycles cannot be re-run; DRAFT/REVIEW re-runs delete their
  draft bills (refused once a draft has payments).
- Account balance everywhere (payer 360°, account view, statement, dashboard outstanding)
  uses the same Σ charges − Σ payments rule (`billing.rules.ts#accountOutstanding`); a payment
  against the latest bill therefore settles the arrears it rolled up.
- Bills take payments like assessments (same `applyPayment` rule, row locked), but only the
  latest released bill of an account does: an older bill is superseded once a later one has
  been released with its balance as arrears (`supersedingBill`, `BILL_SUPERSEDED`). PDFs are
  rendered lazily on first request if missing (seeded cycles).

**Endpoints.** `tariffs`, `water-accounts` (+ `/statement`, `/statement.pdf`), `meters`
(+ `/replace`), `readings` (+ `/preview`), `bulk-uploads/meter-readings` (+ template),
`billing-cycles` (+ `/release`), `bills` (+ `/pdf`, `/clear-flag`, `/confirm-flag`).
Permissions: `bills.view`, `meters.read`, `billing.run`, `billing.release`,
`payers.register` (accounts/meters), `config.manage` (tariffs).

**Testing.** Unit: `tariffs.rules.spec.ts`, `readings.rules.spec.ts`, `billing.rules.spec.ts`,
`statements.rules.spec.ts`, `bills.rules.spec.ts`. E2E: `test/water-billing.e2e-spec.ts`.
