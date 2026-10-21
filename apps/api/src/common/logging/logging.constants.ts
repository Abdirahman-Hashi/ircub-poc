/** Paths excluded from per-request access logs (probed every few seconds by orchestrators). */
export const LOG_IGNORED_PATHS: readonly string[] = ['/health', '/ready'];

/** Header values that must never reach a log sink. */
export const LOG_REDACT_PATHS: readonly string[] = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
];

export const PINO_PRETTY_TARGET = 'pino-pretty';
