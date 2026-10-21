/**
 * Domain enumerations shared by api, web and mocks.
 *
 * Each is mirrored 1:1 by a Prisma enum of the same name in apps/api/prisma/schema.prisma;
 * keep the two in sync. They are `as const` objects with a union type (not TS `enum`s) so
 * Prisma's generated string-literal unions are assignable both ways without casts.
 */

export const Currency = {
  SOS: 'SOS',
  USD: 'USD',
} as const;
export type Currency = (typeof Currency)[keyof typeof Currency];

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  DEACTIVATED: 'DEACTIVATED',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const AuditAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export const PayerType = {
  INDIVIDUAL: 'INDIVIDUAL',
  BUSINESS: 'BUSINESS',
} as const;
export type PayerType = (typeof PayerType)[keyof typeof PayerType];

export const PayerStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;
export type PayerStatus = (typeof PayerStatus)[keyof typeof PayerStatus];

export const AssessmentStatus = {
  PENDING: 'PENDING',
  PART_PAID: 'PART_PAID',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
} as const;
export type AssessmentStatus = (typeof AssessmentStatus)[keyof typeof AssessmentStatus];

export const PaymentChannel = {
  CASH: 'CASH',
  BANK: 'BANK',
  MOBILE_MONEY: 'MOBILE_MONEY',
  BULK: 'BULK',
} as const;
export type PaymentChannel = (typeof PaymentChannel)[keyof typeof PaymentChannel];

export const PaymentStatus = {
  INITIATED: 'INITIATED',
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  FAILED: 'FAILED',
  PERMANENTLY_FAILED: 'PERMANENTLY_FAILED',
  REVERSED: 'REVERSED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const ReversalStatus = {
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type ReversalStatus = (typeof ReversalStatus)[keyof typeof ReversalStatus];

export const BulkUploadKind = {
  REVENUE_TRANSACTIONS: 'REVENUE_TRANSACTIONS',
  METER_READINGS: 'METER_READINGS',
} as const;
export type BulkUploadKind = (typeof BulkUploadKind)[keyof typeof BulkUploadKind];

export const ReadingType = {
  NORMAL: 'NORMAL',
  ROLLOVER: 'ROLLOVER',
  REPLACEMENT: 'REPLACEMENT',
} as const;
export type ReadingType = (typeof ReadingType)[keyof typeof ReadingType];

export const ReadingSource = {
  MANUAL: 'MANUAL',
  CSV: 'CSV',
} as const;
export type ReadingSource = (typeof ReadingSource)[keyof typeof ReadingSource];

export const MeterStatus = {
  ACTIVE: 'ACTIVE',
  REPLACED: 'REPLACED',
  FAULTY: 'FAULTY',
} as const;
export type MeterStatus = (typeof MeterStatus)[keyof typeof MeterStatus];

export const WaterAccountStatus = {
  ACTIVE: 'ACTIVE',
  DISCONNECTED: 'DISCONNECTED',
} as const;
export type WaterAccountStatus = (typeof WaterAccountStatus)[keyof typeof WaterAccountStatus];

export const BillingCycleStatus = {
  DRAFT: 'DRAFT',
  REVIEW: 'REVIEW',
  RELEASED: 'RELEASED',
} as const;
export type BillingCycleStatus = (typeof BillingCycleStatus)[keyof typeof BillingCycleStatus];

export const BillStatus = {
  DRAFT: 'DRAFT',
  FLAGGED: 'FLAGGED',
  RELEASED: 'RELEASED',
  PART_PAID: 'PART_PAID',
  PAID: 'PAID',
} as const;
export type BillStatus = (typeof BillStatus)[keyof typeof BillStatus];

export const NotificationChannel = {
  SMS: 'SMS',
  EMAIL: 'EMAIL',
} as const;
export type NotificationChannel = (typeof NotificationChannel)[keyof typeof NotificationChannel];

export const NotificationStatus = {
  QUEUED: 'QUEUED',
  SENT: 'SENT',
  FAILED: 'FAILED',
} as const;
export type NotificationStatus = (typeof NotificationStatus)[keyof typeof NotificationStatus];

export const ReconciliationLineStatus = {
  MATCHED: 'MATCHED',
  MISSING_IN_IRCUB: 'MISSING_IN_IRCUB',
  MISSING_IN_CHANNEL: 'MISSING_IN_CHANNEL',
  AMOUNT_MISMATCH: 'AMOUNT_MISMATCH',
} as const;
export type ReconciliationLineStatus =
  (typeof ReconciliationLineStatus)[keyof typeof ReconciliationLineStatus];

export const JournalBatchKind = {
  COLLECTIONS: 'COLLECTIONS',
  REVERSAL: 'REVERSAL',
} as const;
export type JournalBatchKind = (typeof JournalBatchKind)[keyof typeof JournalBatchKind];

export const JournalBatchStatus = {
  PENDING: 'PENDING',
  POSTED: 'POSTED',
  FAILED: 'FAILED',
  REVERSED: 'REVERSED',
} as const;
export type JournalBatchStatus = (typeof JournalBatchStatus)[keyof typeof JournalBatchStatus];

export const FmisReconciliationStatus = {
  MATCHED: 'MATCHED',
  MISMATCH: 'MISMATCH',
  MISSING_IN_FMIS: 'MISSING_IN_FMIS',
} as const;
export type FmisReconciliationStatus =
  (typeof FmisReconciliationStatus)[keyof typeof FmisReconciliationStatus];

export const AlertType = {
  COLLECTION_DROP: 'COLLECTION_DROP',
  REVERSAL_SPIKE: 'REVERSAL_SPIKE',
  PAYMENT_PERMANENTLY_FAILED: 'PAYMENT_PERMANENTLY_FAILED',
  FMIS_BATCH_FAILED: 'FMIS_BATCH_FAILED',
  ABNORMAL_CONSUMPTION: 'ABNORMAL_CONSUMPTION',
} as const;
export type AlertType = (typeof AlertType)[keyof typeof AlertType];

export const AlertSeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
} as const;
export type AlertSeverity = (typeof AlertSeverity)[keyof typeof AlertSeverity];
