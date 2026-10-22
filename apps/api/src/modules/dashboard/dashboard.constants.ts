import { CSV_TEMPLATES } from '@ircub/shared';

export const DASHBOARD_API = {
  PATH: 'dashboard',
  OVERVIEW: 'overview',
  TRENDS: 'trends',
  TARGETS: 'targets',
  EFFICIENCY: 'efficiency',
  FORECAST: 'forecast',
  REBUILD: 'rebuild',
  ALERTS_PATH: 'alerts',
  ACK: 'ack',
  EVALUATE: 'evaluate',
  TARGETS_PATH: 'targets',
  IMPORT: 'import',
  TEMPLATE: 'template.csv',
  /** Hourly: rebuild the last two days of summaries (D18). */
  SUMMARY_CRON: '0 * * * *',
  REBUILD_RECENT_DAYS: 2,
  /** Every five minutes: anomaly evaluation (D18). */
  ALERT_CRON: '*/5 * * * *',
  /** A state change marks its day dirty; the rebuild runs once the burst settles. */
  DIRTY_DEBOUNCE_MS: 5_000,
  /** Dashboard reads are aggregated; a short private cache keeps repeated loads cheap. */
  CACHE_CONTROL: 'private, max-age=30',
  /** Longest range one dashboard query may cover. */
  MAX_RANGE_DAYS: 400,
  /** Longest period range for target attainment. */
  MAX_TARGET_MONTHS: 36,
  PERCENT: 100,
  HOURS_PER_DAY: 24,
  /** A regression needs at least this many monthly points. */
  MIN_FORECAST_POINTS: 3,
  /** Anomalies need at least this many baseline days. */
  MIN_BASELINE_DAYS: 5,
  /** Below this R² the caveat says the trend is weak. */
  WEAK_R2: 0.5,
  HOLT: { ALPHA: 0.5, BETA: 0.3 },
  LABELS: { ALL: 'All collections' },
} as const;

export const REVENUE_TARGETS_TEMPLATE = CSV_TEMPLATES.REVENUE_TARGETS;

export const TARGET_COLUMN = {
  PERIOD: 'period',
  REVENUE_TYPE_CODE: 'revenue_type_code',
  AMOUNT: 'amount',
} as const;

export const TARGET_REASON = {
  UNKNOWN_REVENUE_TYPE: 'UNKNOWN_REVENUE_TYPE',
  DUPLICATE_IN_FILE: 'DUPLICATE_IN_FILE',
} as const;

/** Alert copy, built from the facts the evaluator found. */
export const ALERT_TEXT = {
  COLLECTION_DROP: {
    title: 'Collections are below the trailing average',
    message: (todaySoFar: string, expected: string, z: string): string =>
      `Collected ${todaySoFar} so far today against an expected ${expected} (z = ${z}).`,
  },
  REVERSAL_SPIKE: {
    title: 'Unusual number of reversals today',
    message: (count: number, mean: string, z: string): string =>
      `${count} reversals approved today against a daily average of ${mean} (z = ${z}).`,
  },
  PAYMENT_PERMANENTLY_FAILED: {
    title: 'Payment permanently failed',
    message: (controlNumber: string, channel: string, attempts: number): string =>
      `Payment for ${controlNumber} via ${channel} could not be confirmed after ${attempts} status checks.`,
  },
  FMIS_BATCH_FAILED: {
    title: 'FMIS journal batch failed',
    message: (date: string, attempts: number, error: string): string =>
      `Batch for ${date} failed after ${attempts} attempts: ${error}`,
  },
  ABNORMAL_CONSUMPTION: {
    title: 'Abnormal consumption flagged',
    message: (period: string, count: number): string =>
      `${count} bills were flagged for abnormal consumption in the ${period} billing cycle.`,
  },
  Z_DECIMALS: 2,
} as const;
