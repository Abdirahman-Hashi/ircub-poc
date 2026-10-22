import { FmisReconciliationStatus, JournalBatchStatus } from '@ircub/shared';

export const FMIS_UI = {
  EXPORT_FILE_NAME: 'fmis-reconciliation.csv',
  /** Default reconciliation window shown on first load. */
  DEFAULT_RANGE_DAYS: 7,
  LINES_PAGE: 500,
} as const;

export const BATCH_STATUS_COLORS: Readonly<Record<string, string>> = {
  [JournalBatchStatus.PENDING]: 'yellow',
  [JournalBatchStatus.POSTED]: 'teal',
  [JournalBatchStatus.FAILED]: 'red',
  [JournalBatchStatus.REVERSED]: 'orange',
};

export const RECON_STATUS_COLORS: Readonly<Record<string, string>> = {
  [FmisReconciliationStatus.MATCHED]: 'teal',
  [FmisReconciliationStatus.MISMATCH]: 'orange',
  [FmisReconciliationStatus.MISSING_IN_FMIS]: 'red',
};

export const DEFAULT_COLOR = 'gray';
