import { ENV } from './env.constants';
import { MOCKS_PORT } from './mocks-url.constants';

/** The mocks app is served beside the API in dev and Compose; derive its URL for demo links. */
export function mocksUrl(path: string): string {
  try {
    const api = new URL(ENV.API_URL, window.location.origin);
    api.port = MOCKS_PORT;
    api.pathname = path;
    return api.toString();
  } catch {
    return path;
  }
}
