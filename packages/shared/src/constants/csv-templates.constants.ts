/**
 * Column contracts for the bulk CSV uploads (docs/DECISIONS.md D12). The API validates
 * headers against these; the web offers them as downloadable templates.
 */
export const CSV_TEMPLATES = {
  REVENUE_TRANSACTIONS: {
    fileName: 'revenue-transactions-template.csv',
    columns: ['control_number', 'amount', 'currency', 'channel', 'channel_txn_ref', 'paid_at'],
    optionalColumns: ['captured_by_email'],
  },
  METER_READINGS: {
    fileName: 'meter-readings-template.csv',
    columns: ['meter_serial', 'reading_date', 'reading_value', 'type'],
  },
  CHANNEL_STATEMENT: {
    fileName: 'channel-statement.csv',
    columns: ['txn_ref', 'date', 'amount', 'currency', 'control_number', 'status'],
  },
} as const;

export const CSV = {
  DELIMITER: ',',
  MIME_TYPES: ['text/csv', 'application/vnd.ms-excel', 'text/plain'],
  /** Rows shown in the dry-run preview before the user confirms an import. */
  PREVIEW_ROWS: 20,
} as const;
