export const SYSTEM_CONFIG = {
  PATH: 'config',
  /** In-memory cache lifetime; an admin change is visible everywhere within this window. */
  CACHE_TTL_MS: 30_000,
} as const;
