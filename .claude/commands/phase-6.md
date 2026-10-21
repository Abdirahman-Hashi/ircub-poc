---
description: Phase 6 — executive dashboard with pre-aggregated data, trends, collections vs targets, collection efficiency, linear-regression forecast with R², anomaly alerts over SSE
---

Read `CLAUDE.md`, `docs/DECISIONS.md` (D4, D18) and `docs/PROGRESS.md`. This phase
implements brief **Module 7 (Dashboard with Predictive Analytics)**. The brief explicitly
asks for server-side processing, pre-aggregated data, async updates, a linear regression
(or better, justified), and real-time anomaly alerts.

## Standards reminder (applies to every file in this phase)
`docs/ENGINEERING-STANDARDS.md` is enforced by lint and `/review`: every threshold, limit,
duration, code, prefix, job/event name, message and URL is a named constant, a
`SystemConfigKey` (for runtime-tunable business parameters — add key, typed default and
seed entry together), an env value, or a shared enum; every `interface`/`type`/`enum` is in
`*.types.ts`, `dto/*.dto.ts` or `packages/shared`; business rules are pure functions in
`*.rules.ts` with unit tests; external HTTP sits behind an injected interface; each new
module gets a `README.md`. Before committing, run `pnpm lint` and fix, do not disable rules.

## Prisma models to add
`DailyCollectionSummary` (date, revenueTypeId, channel, currency 'SOS', total Decimal,
count int, reversedTotal Decimal, reversedCount int, @@unique([date, revenueTypeId,
channel])), `DailyBillingSummary` (date, billedTotal, collectedTotal — water only),
`RevenueTarget` (period 'YYYY-MM', revenueTypeId, amount, @@unique([period,
revenueTypeId])), `Alert` (type COLLECTION_DROP|REVERSAL_SPIKE|PAYMENT_PERMANENTLY_FAILED|
FMIS_BATCH_FAILED|ABNORMAL_CONSUMPTION, severity INFO|WARNING|CRITICAL, title, message,
data json, createdAt, acknowledgedById?, acknowledgedAt?). Register `RevenueTarget`,
`Alert` in `audit.config.ts`.

## API (`modules/dashboard`)
1. **Aggregation** (`SummaryService`): `rebuild(from, to)` recomputes
   `DailyCollectionSummary` from `Payment` (CONFIRMED by `paidAt`; REVERSED counted in
   `reversedTotal` by reversal decision date) and `DailyBillingSummary` from `Bill`
   (RELEASED by `periodEnd`) and water payments. Cron hourly: rebuild last 2 days; after
   any payment/reversal/bill state change emit an internal event that rebuilds **that
   day** (debounced 5 s). `POST /dashboard/rebuild { from, to }` (`config.manage`).
   Seed: full rebuild for the last 12 months at seed end.
2. **Endpoints** (`dashboard.view`), all reading summaries only, never raw payments:
   - `GET /dashboard/overview?from&to` → KPI cards: total collected, vs same period last
     year, count, reversed total/count, outstanding assessments, outstanding water,
     collection efficiency (water collected / billed), target attainment (collected /
     target, tax).
   - `GET /dashboard/trends?from&to&groupBy=day|week|month&by=revenueType|channel` →
     series for the line chart.
   - `GET /dashboard/targets?period=YYYY-MM..` → per revenue type collected vs target.
   - `GET /dashboard/efficiency?from&to` → water billed vs collected per month.
   - `GET /dashboard/forecast?months=3` → see 3.
   - `GET /alerts?acknowledged=false`, `POST /alerts/:id/ack` (`alerts.view`).
   - `RevenueTarget` CRUD + CSV import (`targets.manage`), seed 12 months per type.
3. **Forecast** (`ForecastService`): monthly totals for the last 12 full months (from
   summaries) → `simple-statistics` `linearRegression` + `linearRegressionLine` →
   project the next `months`; return `{ model: 'ols-linear', points: [...history,
   ...forecast with `forecast: true`], slope, intercept, r2, n, caveat }` where `caveat`
   explains the model choice in one sentence (12 points, trend only, no seasonality;
   if `r2 < 0.5` say the trend is weak). Also compute per-revenue-type forecasts when
   `?by=revenueType`. **Justification for "or better":** keep OLS as default, and add an
   optional `model=holt` (Holt's linear exponential smoothing, implement in ~30 lines,
   alpha=0.5, beta=0.3) so the UI can toggle and show both; note in README why OLS is the
   default (interpretable, 12 data points).
4. **Anomaly detection** (`AlertService`, cron every 5 min, and on demand `POST
   /alerts/evaluate`): for today-so-far vs the trailing 30 days' same-hour cumulative
   collections (use summaries + a light `COUNT/SUM` of today's payments, which is small):
   `z = (today − mean) / stddev`; `z < −2` → `COLLECTION_DROP` WARNING (CRITICAL < −3);
   reversals today vs trailing 30-day daily reversal counts `z > 2` → `REVERSAL_SPIKE`.
   De-duplicate: one open alert per type per day. Also create alerts from phase 4/5
   events: `PAYMENT_PERMANENTLY_FAILED`, `FMIS_BATCH_FAILED`, and `ABNORMAL_CONSUMPTION`
   (count per cycle run). Emit SSE `alert.created` to users with `alerts.view`.
5. **Performance**: summary tables indexed on `(date)`, `(revenueTypeId, date)`; endpoints
   paginate nothing — they return at most a few hundred aggregated rows; set
   `Cache-Control: private, max-age=30` on trends/overview. Add a quick
   `scripts/bench.ts` that times `/dashboard/trends` for 12 months to show it stays
   < 100 ms with the seed data (record the number in PROGRESS).

## Frontend (`features/dashboard`)
Executive dashboard (default landing for Supervisor, Admin, Auditor):
- KPI cards row; date-range picker (presets: 30d, 90d, YTD, 12m).
- **Revenue trends** line chart with toggle by revenue type / by channel, groupBy
  day/week/month.
- **Collections vs targets** bar chart per revenue type for the selected month(s) with
  attainment %.
- **Water billed vs collected** (collection efficiency) bar/line combo per month.
- **Forecast** chart: history solid, next-quarter dashed, model toggle (OLS / Holt),
  R², slope, caveat text.
- **Alerts** panel: live list (SSE), severity badges, acknowledge; header bell with
  unacknowledged count across the app.
- Auto-refresh KPIs every 60 s via TanStack Query `refetchInterval`; SSE for alerts and
  payment events triggers invalidation of overview/trends.
- Targets admin page (table edit + CSV import).

## Tests (minimum)
Unit: summary rebuild from a known payment set (totals, reversed), forecast on a synthetic
linear series (slope/intercept/r2 ≈ 1), Holt on a known series, z-score alert thresholds
(no alert at −1.9, alert at −2.1, critical at −3.1, stddev = 0 guard), alert de-duplication.
E2E: `/dashboard/overview` and `/trends` return within budget with the seed; `/forecast`
returns 3 future points; `POST /alerts/evaluate` after seeding a drop creates an alert and
the SSE stream delivers it. Web (Vitest): forecast chart renders dashed segment flag; alerts
panel ack.

Commits: `feat(api): daily collection and billing summaries with rebuild job` · `feat(api): dashboard endpoints and revenue targets` ·
`feat(api): revenue forecast (ols + holt) with r2` · `feat(api): anomaly alerts and sse stream` ·
`feat(web): executive dashboard with charts, forecast, live alerts` · `test(api): dashboard, forecast, alerts` · `docs: phase 6 progress`
