/** Hash-chain parameters (D8). Changing any of these invalidates existing chains. */
export const AUDIT = {
  HASH_ALGORITHM: 'sha256',
  /** prevHash of the first row: 64 zero characters. */
  GENESIS_HASH: '0'.repeat(64),
  CHAIN_HEAD_ID: 1,
  /** Placeholder written in `before`/`after` for secret-bearing fields. */
  REDACTED: '[REDACTED]',
  /** Separator for composite entity ids (`roleId:permissionId`). */
  COMPOSITE_ID_SEPARATOR: ':',
  /** Rows fetched per page when verifying the chain. */
  VERIFY_BATCH_SIZE: 500,
} as const;

/** Actor recorded when a mutation happens outside a request (jobs, seed, crons). */
export const AUDIT_ACTOR = {
  SYSTEM_EMAIL: 'SYSTEM',
} as const;
