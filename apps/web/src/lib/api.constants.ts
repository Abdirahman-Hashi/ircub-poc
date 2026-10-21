export const HTTP = {
  UNAUTHORIZED: 401,
  NO_CONTENT: 204,
  METHOD_POST: 'POST',
  HEADER_AUTHORIZATION: 'Authorization',
  HEADER_CONTENT_TYPE: 'Content-Type',
  CONTENT_TYPE_JSON: 'application/json',
  BEARER_PREFIX: 'Bearer ',
} as const;

export const HEALTH_POLL = {
  /** How often the wake-up overlay re-checks the API while it is unreachable. */
  INTERVAL_MS: 3_000,
} as const;
