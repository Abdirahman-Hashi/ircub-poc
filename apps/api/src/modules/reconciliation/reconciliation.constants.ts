export const RECONCILIATION_API = {
  PATH: 'reconciliation',
  RUNS: 'runs',
  STATEMENTS: 'statements',
  EXPORT: 'export.csv',
  EXPORT_FILE_NAME: 'reconciliation.csv',
  EXPORT_COLUMNS: [
    'status',
    'txn_ref',
    'control_number',
    'ircub_amount',
    'channel_amount',
    'currency',
    'note',
  ] as const,
  SORTABLE: ['createdAt', 'runDate', 'channel', 'status'] as const,
  /** Sub-directory of STORAGE_DIR where fetched/uploaded statements are kept. */
  STATEMENT_DIR: 'statements',
  /** Daily run for yesterday, both channels (D16). */
  DAILY_CRON: '0 1 * * *',
  /** `YYYY-MM-DD` (UTC business day). */
  DATE_PATTERN: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  /** Statement filename when fetched from a channel. */
  FETCHED_FILE_NAME: (channel: string, date: string): string =>
    `${channel.toLowerCase()}-${date}.csv`,
} as const;
