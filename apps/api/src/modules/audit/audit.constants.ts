export const AUDIT_API = {
  PATH: 'audit',
  VERIFY_PATH: 'verify',
  /** Columns a client may sort the log by. */
  SORTABLE: ['seq', 'createdAt', 'entity', 'actorEmail'] as const,
} as const;
