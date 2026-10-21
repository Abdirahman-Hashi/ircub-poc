/** Names and defaults for the environment contract; the schema in env.schema.ts validates them. */
export const NODE_ENVS = ['development', 'test', 'production'] as const;

export const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'] as const;

export const ENV_DEFAULTS = {
  NODE_ENV: 'development',
  PORT: 3000,
  LOG_LEVEL: 'info',
  /** 15 minutes (D5). */
  JWT_ACCESS_TTL_SECONDS: 900,
  /** 7 days (D5). */
  JWT_REFRESH_TTL_SECONDS: 604_800,
  STORAGE_DIR: './storage',
} as const;

export const ENV_LIMITS = {
  /** Secrets shorter than this are rejected at boot. */
  MIN_SECRET_LENGTH: 32,
  MIN_SHARED_SECRET_LENGTH: 16,
} as const;

/** `.env` is at the repository root; the second entry covers `pnpm --filter api …` (cwd = apps/api). */
export const ENV_FILE_PATHS = ['.env', '../../.env'] as const;

export const CORS_ORIGIN_SEPARATOR = ',';
