import { RECONCILIATION_API } from '../reconciliation/reconciliation.constants';

/** Injection token for the FMIS client (standards §3: external systems behind interfaces). */
export const FMIS_CLIENT = Symbol('FMIS_CLIENT');

export const FMIS_API = {
  PATH: 'fmis',
  MAPPINGS: 'gl-mappings',
  BATCHES: 'batches',
  BUILD: 'build',
  BUILD_RANGE: 'build-range',
  RETRY: 'retry',
  LINES: 'lines',
  RECONCILIATION: 'reconciliation',
  EXPORT: 'export.csv',
  EXPORT_FILE_NAME: 'fmis-reconciliation.csv',
  EXPORT_COLUMNS: [
    'date',
    'gl_code',
    'gl_name',
    'ircub_total',
    'fmis_total',
    'difference',
    'status',
  ] as const,
  SORTABLE: ['batchDate', 'createdAt', 'status', 'kind'] as const,
  DATE_PATTERN: RECONCILIATION_API.DATE_PATTERN,
  /** Daily batch for yesterday (D17). */
  DAILY_CRON: '30 0 * * *',
  /** Outbound HTTP timeout to the FMIS. */
  TIMEOUT_MS: 10_000,
  /** FMIS ledger responses are cached this long for the reconciliation screen. */
  LEDGER_CACHE_MS: 60_000,
  /** Longest range the reconciliation screen may ask for in one call. */
  MAX_RECONCILIATION_DAYS: 62,
  /** Longest range `build-range` accepts (seed and backfill). */
  MAX_BUILD_DAYS: 366,
  /** Posted amounts carry two decimals in the FMIS payload. */
  AMOUNT_DECIMALS: 2,
  ZERO: '0.00',
} as const;
