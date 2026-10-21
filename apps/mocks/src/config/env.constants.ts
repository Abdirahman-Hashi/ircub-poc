export const NODE_ENVS = ['development', 'test', 'production'] as const;

export const ENV_DEFAULTS = {
  NODE_ENV: 'development',
  MOCKS_PORT: 3100,
  MOCK_CALLBACK_DELAY_MS: 3000,
  LOG_LEVEL: 'info',
} as const;

export const ENV_LIMITS = {
  MIN_SHARED_SECRET_LENGTH: 16,
} as const;

export const ENV_FILE_PATHS = ['.env', '../../.env'] as const;
