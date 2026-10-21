/** pg-boss runtime settings; business retry policies come from SystemConfig per job. */
export const JOBS = {
  /** Postgres schema pg-boss owns; keeps queue tables apart from the Prisma-managed ones. */
  SCHEMA: 'pgboss',
  /** Seconds pg-boss waits for in-flight handlers on shutdown. */
  STOP_TIMEOUT_MS: 10_000,
  /** How often workers poll a queue when idle. */
  POLLING_INTERVAL_SECONDS: 2,
  /** Jobs fetched per poll; 1 keeps handlers simple and failures isolated. */
  BATCH_SIZE: 1,
} as const;
