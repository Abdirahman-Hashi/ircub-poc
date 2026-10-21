export const FX_API = {
  PATH: 'fx',
  LATEST: 'latest',
  HISTORY: 'history',
  HISTORY_LIMIT: 50,
} as const;

/** Where a stored rate came from. */
export const FX_SOURCE = {
  SEED: 'seed',
  MOCK_PROVIDER: 'mock-fx-api',
  MANUAL: 'manual',
} as const;
