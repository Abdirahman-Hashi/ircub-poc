# fx

**Purpose.** Exchange rates: live quotes from the provider stored as history, a stale
fallback when the provider is down, and conversion of foreign-currency payments at capture
time (D9, D15).

**Rules.**

- `getRate(base, quote)` asks the `FxRateProvider` (mock FX API over HTTP), stores the quote
  (6 dp) and returns it. On failure it returns the latest stored rate with a warning and
  `stale: true` when that rate is older than `SystemConfigKey.FX_STALE_AFTER_MINUTES`; with
  nothing stored it raises `FX_RATE_UNAVAILABLE` (503) rather than guess.
- `toLocal` converts at the rate retrieved _now_ (not the last cached one), rounding once
  HALF_EVEN to 2 dp; local-currency amounts store `fxRate = 1`.
- A scheduler interval refreshes every non-local currency every `FX_REFRESH_MINUTES` (read at
  boot from SystemConfig; a change applies on the next restart).

**Endpoints** (`fx.view`): `GET /fx/latest`, `POST /fx/refresh`, `GET /fx/history`; `base`
and `quote` default to USD → local currency.

**Testing.** Unit: `fx.service.spec.ts` (quote stored, stale fallback inside/outside the
window, no stored rate, conversion rounding), `common/money/money.rules.spec.ts`.
