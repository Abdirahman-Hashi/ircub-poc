import { API } from '@ircub/shared';

/** Build-time environment, resolved once. Empty VITE_API_URL means "same origin via nginx /api". */
export const ENV = {
  API_URL: import.meta.env.VITE_API_URL ?? API.PROXY_PREFIX,
} as const;
