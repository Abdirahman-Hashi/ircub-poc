import { ReconciliationLineStatus } from '@ircub/shared';

export const RECONCILIATION_UI = {
  EXPORT_FILE_NAME: (runId: string): string => `reconciliation-${runId}.csv`,
  ALL_STATUSES: '',
  STATEMENT_COLUMNS: 'txn_ref,date,amount,currency,control_number,status',
} as const;

export const LINE_STATUS_COLORS: Readonly<Record<string, string>> = {
  [ReconciliationLineStatus.MATCHED]: 'teal',
  [ReconciliationLineStatus.AMOUNT_MISMATCH]: 'orange',
  [ReconciliationLineStatus.MISSING_IN_IRCUB]: 'red',
  [ReconciliationLineStatus.MISSING_IN_CHANNEL]: 'red',
};

export const RUN_STATUS_COLORS: Readonly<Record<string, string>> = {
  COMPLETED: 'teal',
  FAILED: 'red',
};
