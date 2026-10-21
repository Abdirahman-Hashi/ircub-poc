export const SSE = {
  /** Keeps proxies (nginx, Render) from closing idle streams. */
  HEARTBEAT_INTERVAL_MS: 25_000,
  PATH: 'events',
} as const;
