import { E2E_MOCK_CALLBACK_DELAY_MS, E2E_PORTS } from '../test-env.constants';

/**
 * Imported first by `channels.e2e-spec.ts`. `ConfigModule.forRoot()` reads the environment
 * when the app module file is imported, so these overrides must be in place before the API
 * or the mocks module is loaded: the API must be reachable over HTTP for channel callbacks,
 * and the mocks listen on their own port in the same process.
 */
process.env.API_PUBLIC_URL = `http://localhost:${E2E_PORTS.API}`;
process.env.MOCKS_BASE_URL = `http://localhost:${E2E_PORTS.MOCKS}`;
process.env.MOCKS_PORT = String(E2E_PORTS.MOCKS);
process.env.MOCK_CALLBACK_DELAY_MS = E2E_MOCK_CALLBACK_DELAY_MS;
