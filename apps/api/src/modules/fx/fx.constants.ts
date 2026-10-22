export const FX_API = {
  PATH: 'fx',
  /** Pair assumed when a request names none: the foreign currency the platform accepts. */
  DEFAULT_BASE: 'USD',
  LATEST: 'latest',
  HISTORY: 'history',
  REFRESH: 'refresh',
  HISTORY_LIMIT: 50,
  /** Mock FX endpoint relative to MOCKS_BASE_URL. */
  PROVIDER_PATH: '/rates',
  PROVIDER_TIMEOUT_MS: 5_000,
  /** Cron: every 15 minutes (the SystemConfig key documents the intent; cron strings are static). */
  REFRESH_CRON: '*/15 * * * *',
  MS_PER_MINUTE: 60_000,
} as const;

/** Where a stored rate came from. */
export const FX_SOURCE = {
  SEED: 'seed',
  MOCK_PROVIDER: 'mock-fx-api',
  MANUAL: 'manual',
} as const;

/** Injection token for the provider (tests inject a fake). */
export const FX_RATE_PROVIDER = Symbol('FX_RATE_PROVIDER');
