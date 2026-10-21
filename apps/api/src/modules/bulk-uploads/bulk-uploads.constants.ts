import { CSV_TEMPLATES } from '@ircub/shared';

export const BULK_UPLOADS_API = {
  PATH: 'bulk-uploads',
  REVENUE_TRANSACTIONS: 'revenue-transactions',
  TEMPLATE: 'template.csv',
  DRY_RUN_QUERY: 'dryRun',
} as const;

export const REVENUE_TRANSACTIONS_TEMPLATE = CSV_TEMPLATES.REVENUE_TRANSACTIONS;

/** Rejection reasons specific to the revenue-transactions importer. */
export const BULK_REASON = {
  INVALID_CONTROL_NUMBER: 'INVALID_CONTROL_NUMBER',
  UNKNOWN_ASSESSMENT: 'UNKNOWN_ASSESSMENT',
  ASSESSMENT_NOT_PAYABLE: 'ASSESSMENT_NOT_PAYABLE',
  AMOUNT_NOT_POSITIVE: 'AMOUNT_NOT_POSITIVE',
  OVERPAYMENT: 'OVERPAYMENT',
  TXN_REF_REQUIRED: 'TXN_REF_REQUIRED',
  DUPLICATE_TXN_REF_IN_FILE: 'DUPLICATE_TXN_REF_IN_FILE',
  DUPLICATE_TXN_REF_IN_DB: 'DUPLICATE_TXN_REF_IN_DB',
  UNKNOWN_CAPTURER: 'UNKNOWN_CAPTURER',
  FX_RATE_UNAVAILABLE: 'FX_RATE_UNAVAILABLE',
} as const;

export const BULK_COLUMN = {
  CONTROL_NUMBER: 'control_number',
  AMOUNT: 'amount',
  CURRENCY: 'currency',
  CHANNEL: 'channel',
  CHANNEL_TXN_REF: 'channel_txn_ref',
  PAID_AT: 'paid_at',
  CAPTURED_BY_EMAIL: 'captured_by_email',
} as const;
