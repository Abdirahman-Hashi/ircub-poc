# fx

**Purpose.** Exchange-rate history and conversion of foreign-currency payments into the local
currency (D9). Phase 2 reads the latest stored rate; phase 4 adds the provider that keeps it fresh.

**Rules.**

- Local currency is `SystemConfigKey.LOCAL_CURRENCY`; a payment in it stores `fxRate = 1`.
- Conversion = amount × rate (6 dp), rounded HALF_EVEN to 2 dp once at the end
  (`common/money/money.rules.ts`).
- No stored rate for the pair → `FX_RATE_UNAVAILABLE` (503); captures in that currency fail
  rather than guess.

**Endpoints** (`fx.view`): `GET /fx/latest?base&quote`, `GET /fx/history?base&quote`.

**Testing.** Unit: `common/money/money.rules.spec.ts`. E2E: USD bulk rows in
`test/bulk-upload.e2e-spec.ts` convert with the seeded rate.
