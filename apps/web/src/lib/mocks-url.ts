import { ENV } from './env.constants';
import { MOCKS_PORT } from './mocks-url.constants';

/**
 * Demo links to the mocks app: the configured public URL when the deployment has one
 * (Render), otherwise the API host on the mocks' dev port (pnpm dev, Compose).
 */
export function mocksUrl(path: string): string {
  if (ENV.MOCKS_URL !== null) {
    return `${ENV.MOCKS_URL.replace(/\/$/, '')}${path}`;
  }
  try {
    const api = new URL(ENV.API_URL, window.location.origin);
    api.port = MOCKS_PORT;
    api.pathname = path;
    return api.toString();
  } catch {
    return path;
  }
}
