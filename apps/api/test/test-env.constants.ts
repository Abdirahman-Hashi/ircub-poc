/**
 * Environment the e2e suite falls back to when a variable is not already set.
 * Matches docker-compose.test.yml (throwaway Postgres on 5433) and the CI service container.
 */
export const TEST_ENV = {
  NODE_ENV: 'test',
  PORT: '3001',
  LOG_LEVEL: 'silent',
  DATABASE_URL: 'postgresql://ircub:ircub@localhost:5433/ircub_test?schema=public',
  JWT_SECRET: 'test-only-jwt-secret-with-at-least-32-chars',
  JWT_REFRESH_SECRET: 'test-only-refresh-secret-with-at-least-32-chars',
  JWT_ACCESS_TTL: '900',
  JWT_REFRESH_TTL: '604800',
  MOCKS_BASE_URL: 'http://localhost:3100',
  MOCK_SHARED_SECRET: 'test-only-shared-secret',
  API_PUBLIC_URL: 'http://localhost:3001',
  CORS_ORIGIN: 'http://localhost:5173',
  STORAGE_DIR: './storage-test',
} as const satisfies Readonly<Record<string, string>>;

/**
 * Ports for the suite that boots the mocks app in-process and needs the API reachable over
 * HTTP for channel callbacks (`channels.e2e-spec.ts`). Distinct from dev ports so a running
 * `pnpm dev` does not collide.
 */
export const E2E_PORTS = { API: 3901, MOCKS: 3902 } as const;

/** Mock callback delay for the channel suite; short so the suite stays fast. */
export const E2E_MOCK_CALLBACK_DELAY_MS = '200';
