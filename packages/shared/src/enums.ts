/**
 * Domain enumerations shared by api, web and mocks.
 *
 * Each enum is mirrored 1:1 by a Prisma enum of the same name in
 * apps/api/prisma/schema.prisma. Keep the two in sync: Prisma cannot import
 * TypeScript enums, and this file is the single source the web app reads.
 */

export enum Currency {
  SOS = 'SOS',
  USD = 'USD',
}

export enum PayerType {
  INDIVIDUAL = 'INDIVIDUAL',
  BUSINESS = 'BUSINESS',
}

export enum PayerStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum AssessmentStatus {
  PENDING = 'PENDING',
  PART_PAID = 'PART_PAID',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum PaymentChannel {
  CASH = 'CASH',
  BANK = 'BANK',
  MOBILE_MONEY = 'MOBILE_MONEY',
  BULK = 'BULK',
}

export enum PaymentStatus {
  INITIATED = 'INITIATED',
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  PERMANENTLY_FAILED = 'PERMANENTLY_FAILED',
  REVERSED = 'REVERSED',
}

export enum ReversalStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum BulkUploadKind {
  REVENUE_TRANSACTIONS = 'REVENUE_TRANSACTIONS',
  METER_READINGS = 'METER_READINGS',
}

export enum ReadingType {
  NORMAL = 'NORMAL',
  ROLLOVER = 'ROLLOVER',
  REPLACEMENT = 'REPLACEMENT',
}

export enum ReadingSource {
  MANUAL = 'MANUAL',
  CSV = 'CSV',
}

export enum MeterStatus {
  ACTIVE = 'ACTIVE',
  REPLACED = 'REPLACED',
  FAULTY = 'FAULTY',
}

export enum WaterAccountStatus {
  ACTIVE = 'ACTIVE',
  DISCONNECTED = 'DISCONNECTED',
}

export enum BillingCycleStatus {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  RELEASED = 'RELEASED',
}

export enum BillStatus {
  DRAFT = 'DRAFT',
  FLAGGED = 'FLAGGED',
  RELEASED = 'RELEASED',
  PART_PAID = 'PART_PAID',
  PAID = 'PAID',
}

export enum NotificationChannel {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
}

export enum NotificationStatus {
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export enum ReconciliationLineStatus {
  MATCHED = 'MATCHED',
  MISSING_IN_IRCUB = 'MISSING_IN_IRCUB',
  MISSING_IN_CHANNEL = 'MISSING_IN_CHANNEL',
  AMOUNT_MISMATCH = 'AMOUNT_MISMATCH',
}

export enum JournalBatchKind {
  COLLECTIONS = 'COLLECTIONS',
  REVERSAL = 'REVERSAL',
}

export enum JournalBatchStatus {
  PENDING = 'PENDING',
  POSTED = 'POSTED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}

export enum FmisReconciliationStatus {
  MATCHED = 'MATCHED',
  MISMATCH = 'MISMATCH',
  MISSING_IN_FMIS = 'MISSING_IN_FMIS',
}

export enum AlertType {
  COLLECTION_DROP = 'COLLECTION_DROP',
  REVERSAL_SPIKE = 'REVERSAL_SPIKE',
  PAYMENT_PERMANENTLY_FAILED = 'PAYMENT_PERMANENTLY_FAILED',
  FMIS_BATCH_FAILED = 'FMIS_BATCH_FAILED',
  ABNORMAL_CONSUMPTION = 'ABNORMAL_CONSUMPTION',
}

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}
