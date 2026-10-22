# dashboard

**Purpose.** Executive dashboard with predictive analytics (brief Module 7; D4, D18):
pre-aggregated daily summaries, KPI/trend/target/efficiency endpoints that read summaries
only, a monthly forecast, and real-time anomaly alerts over SSE.

**Rules.**

- `DailyCollectionSummary` (day × revenue type × channel) and `DailyBillingSummary` (day)
  are rebuilt from `Payment`, `Reversal` and `Bill` by `rebuildDailySummaries`
  (`summary.rebuild.ts`): CONFIRMED and REVERSED payments by `paidAt`, approved reversals by
  decision date, released bills by `periodEnd`, delete-and-insert in one transaction so a
  reader never sees a half-rebuilt window. Hourly cron for the last two days;
  `markDirty(day)` after any payment (manual, online, bulk), reversal or billing change
  rebuilds that day after a 5 s debounce; `POST /dashboard/rebuild` for any range
  (`config.manage`).
- Dashboard endpoints never read raw payments: overview, trends (day/week/month × revenue
  type/channel), target attainment (WATER excluded: bills, not targets) and water
  collection efficiency come from the summaries; outstanding balances are two aggregates
  over assessments and bills. Overview and trends carry `Cache-Control: private, max-age=30`.
- Forecast: the last `FORECAST_HISTORY_MONTHS` full months → OLS (`simple-statistics`
  `linearRegression`, `rSquared`) projected `FORECAST_HORIZON_MONTHS` ahead; `model=holt-linear`
  runs Holt's linear smoothing (α 0.5, β 0.3). OLS is the default because 12 points support
  an interpretable line with an R², not a seasonal model; the caveat says so and flags a weak
  fit (R² < 0.5). `by=revenueType` fits one series per type.
- Alerts: every 5 min (and `POST /alerts/evaluate`) today's collections so far are compared
  with the trailing `ANOMALY_TRAILING_DAYS` daily totals scaled to the same fraction of the
  day (`z = (today − mean) / stddev`; no alert without spread or fewer than 5 baseline days):
  `z ≤ −ANOMALY_Z_WARNING` → COLLECTION_DROP WARNING, `≤ −ANOMALY_Z_CRITICAL` → CRITICAL;
  today's approved reversals vs trailing daily counts, `z ≥` thresholds → REVERSAL_SPIKE.
  Payments, FMIS and billing raise PAYMENT_PERMANENTLY_FAILED, FMIS_BATCH_FAILED and
  ABNORMAL_CONSUMPTION through `AlertsService.raise`. One open alert per type and
  `dedupeKey`, guaranteed by the partial unique index `alert_open_dedupe_key` (a racing
  evaluator's unique violation is treated as "already open"), not only by the pre-check; the
  key is the day for anomalies and the entity for events. `alert.created` goes to users
  holding `alerts.view`.

**Endpoints.** `GET /dashboard/overview|trends|targets|efficiency|forecast`
(`dashboard.view`), `POST /dashboard/rebuild` (`config.manage`); `GET /alerts`,
`GET /alerts/unacknowledged-count`, `POST /alerts/evaluate`, `POST /alerts/:id/ack`
(`alerts.view`); `GET /targets`, `PUT /targets`, `DELETE /targets/:id`,
`GET /targets/template.csv`, `POST /targets/import` (`targets.manage` to write).

**Testing.** Unit: `dashboard.rules.spec.ts` (aggregation totals and reversals, buckets,
OLS on a linear series, Holt on a known series, z-score thresholds and the stddev-zero
guard, percentages), `alerts.service.spec.ts` (de-duplication). E2E: `test/dashboard.e2e-spec.ts`
(overview/trends timing budget, forecast horizon, evaluate after a seeded drop, SSE delivery).
`scripts/bench.ts` times `/dashboard/trends` against a running API.
