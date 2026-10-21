/** pg-boss runtime settings; business retry policies come from SystemConfig per job. */
export const JOBS = {
  /** Postgres schema pg-boss owns; keeps queue tables apart from the Prisma-managed ones. */
  SCHEMA: 'pgboss',
  /** Seconds pg-boss waits for in-flight handlers on shutdown. */
  STOP_TIMEOUT_MS: 10_000,
  /** How often workers poll a queue when idle. */
  POLLING_INTERVAL_SECONDS: 1,
  /** Jobs fetched per poll; handlers run sequentially within a batch so failures stay isolated. */
  BATCH_SIZE: 10,
} as const;
