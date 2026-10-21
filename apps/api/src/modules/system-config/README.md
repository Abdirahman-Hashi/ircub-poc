# system-config

**Purpose.** Runtime-tunable business parameters (thresholds, retry limits, password policy,
cash GL code, local currency) stored in the `system_config` table and read through a typed API.

**Rules.**

- Keys, value types, defaults and descriptions live in `system-config.keys.ts`; add all four
  in the same commit. The seed inserts the defaults; `get()` falls back to them if a row is
  missing or has the wrong type.
- Values are cached for `SYSTEM_CONFIG.CACHE_TTL_MS` (30 s); `set()` invalidates the key.
- Business code never reads a threshold from a literal — always `systemConfig.get(SystemConfigKey.X)`.

**Endpoints** (`config.manage`): `GET /config` (every key with value, default, description),
`PUT /config/:key { value }` (type-checked against the default; audited with the actor).

**Testing.** Unit: `system-config.service.spec.ts` (fallback on missing/mistyped row, cache TTL).
