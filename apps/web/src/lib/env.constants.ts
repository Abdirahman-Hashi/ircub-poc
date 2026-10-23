import { API } from '@ircub/shared';

const configuredApiUrl: string | undefined = import.meta.env.VITE_API_URL;
const configuredMocksUrl: string | undefined = import.meta.env.VITE_MOCKS_URL;

/**
 * Build-time environment, resolved once. An unset *or empty* VITE_API_URL means "same
 * origin through the /api proxy" (nginx in Compose, the rewrite on Render): Docker and
 * Render pass the variable as an empty string, which `??` alone would have kept.
 */
export const ENV = {
  API_URL:
    configuredApiUrl === undefined || configuredApiUrl.length === 0
      ? API.PROXY_PREFIX
      : configuredApiUrl,
  /** Public URL of the mocks app for demo links; empty → derived from the API URL and the dev port. */
  MOCKS_URL:
    configuredMocksUrl === undefined || configuredMocksUrl.length === 0 ? null : configuredMocksUrl,
} as const;
