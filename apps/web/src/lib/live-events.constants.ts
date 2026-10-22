import { API } from '@ircub/shared';

/** Event names mirror `apps/api/src/common/sse/event-names.ts`. */
export const LIVE_EVENT = {
  PAYMENT_UPDATED: 'payment.updated',
  PAYMENT_PERMANENTLY_FAILED: 'payment.permanently-failed',
} as const;

export const LIVE_EVENTS = {
  TOKEN_QUERY: API.SSE_TOKEN_QUERY,
  /** EventSource stops on a 401 (expired token): reconnect with the refreshed one. */
  RECONNECT_MS: 5_000,
  MAX_ESCALATIONS: 50,
} as const;
