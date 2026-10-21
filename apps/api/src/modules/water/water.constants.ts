/** Shared water-billing constants (D13, D14). Tunable thresholds live in SystemConfig. */
export const WATER = {
  DECIMAL_RADIX: 10,
  PERCENT: 100,
  /** `YYYY-MM` */
  PERIOD_PATTERN: /^\d{4}-(0[1-9]|1[0-2])$/,
  PERIOD_SEPARATOR: '-',
  MONTHS_PER_YEAR: 12,
  MONTH_DIGITS: 2,
  /** Sub-directory of STORAGE_DIR for rendered bill PDFs (D19). */
  BILLS_DIR: 'bills',
  STATEMENTS_DIR: 'statements',
  PDF_EXTENSION: '.pdf',
  PDF_MIME: 'application/pdf',
} as const;

/** Reasons an account is skipped by a billing run (exception report). */
export const SKIP_REASON = {
  NO_READING: 'NO_READING_IN_PERIOD',
  NO_ACTIVE_METER: 'NO_ACTIVE_METER',
  TARIFF_NOT_CONFIGURED: 'TARIFF_NOT_CONFIGURED',
  ERROR: 'ERROR',
} as const;

export const FLAG_REASON = {
  ABNORMAL_CONSUMPTION: 'ABNORMAL_CONSUMPTION',
} as const;

export const TIER_VALIDATION = {
  NOT_STARTING_AT_ZERO: 'NOT_STARTING_AT_ZERO',
  GAP_OR_OVERLAP: 'GAP_OR_OVERLAP',
  LAST_NOT_OPEN_ENDED: 'LAST_NOT_OPEN_ENDED',
  EMPTY_BAND: 'EMPTY_BAND',
  NEGATIVE_RATE: 'NEGATIVE_RATE',
  NO_TIERS: 'NO_TIERS',
} as const;
