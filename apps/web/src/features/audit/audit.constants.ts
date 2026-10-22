import type { AuditAction } from '@ircub/shared';

/** Entities offered in the filter: the audited business models an auditor asks about most. */
export const AUDIT_ENTITIES = [
  'Payer',
  'Assessment',
  'Payment',
  'Reversal',
  'Bill',
  'BillingCycle',
  'MeterReading',
  'JournalBatch',
  'JournalLine',
  'GlMapping',
  'RevenueType',
  'RevenueTarget',
  'User',
  'Role',
  'RolePermission',
  'UserRole',
  'SodRule',
  'SystemConfig',
  'Alert',
] as const;

export const AUDIT_UI = {
  /** Characters kept at each end of a shortened hash. */
  HASH_EDGE: 6,
  /** A shortened hash keeps both ends. */
  HASH_ENDS: 2,
  ACTION_COLORS: { CREATE: 'green', UPDATE: 'blue', DELETE: 'red' } satisfies Record<
    AuditAction,
    string
  >,
} as const;
