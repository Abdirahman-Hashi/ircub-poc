export const ASSESSMENTS_API = {
  PATH: 'assessments',
  EXPORT: 'export.csv',
  CANCEL: 'cancel',
  SORTABLE: ['createdAt', 'dueDate', 'amount', 'status', 'controlNumber'] as const,
  /** Upper bound for a CSV export so one request cannot stream the whole table. */
  EXPORT_MAX_ROWS: 10_000,
  EXPORT_FILE_NAME: 'assessments.csv',
  EXPORT_COLUMNS: [
    'control_number',
    'tin',
    'payer',
    'revenue_type',
    'period',
    'base_amount',
    'amount',
    'paid_amount',
    'outstanding',
    'currency',
    'status',
    'due_date',
    'created_at',
  ] as const,
} as const;

/** Decimal string with up to two decimals, e.g. `12500.50`. */
export const MONEY_PATTERN = /^[0-9]+(\.[0-9]{1,2})?$/;
