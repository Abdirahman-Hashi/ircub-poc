/** Fixed faker seed so every environment gets identical demo data (standards §6). */
export const FAKER_SEED = 42;

/** Password for every seeded demo user (CLAUDE.md). Demo only. */
export const SEED_PASSWORD = 'Passw0rd!2026';

export const SEED_EMAIL_DOMAIN = 'ircub.test';

/** Nest logger levels kept while seeding (audit debug lines are suppressed). */
export const SEED_LOG_LEVELS = ['log', 'warn', 'error'] as const;

/** USD → SOS rate stored by the seed (D9); the mock FX API drifts around the same value. */
export const SEED_FX_RATE = '571.500000';

/** Demo-data volumes (D24) and shape. */
export const DEMO = {
  PAYERS: 200,
  DUPLICATES: 5,
  BUSINESS_RATIO: 0.35,
  COUNTRY_CODE: '+252',
  ASSESSMENTS: 1500,
  /** First assessments left unpaid for the bulk-upload sample and e2e tests. */
  RESERVED_UNPAID: 20,
  PAYMENTS: 900,
  PAID_RATIO: 0.7,
  FULL_PAYMENT_RATIO: 0.6,
  USD_RATIO: 0.15,
  HISTORY_DAYS: 365,
  DUE_DAYS: 30,
  REVERSALS: 10,
  REVERSALS_APPROVED: 4,
  REVERSALS_REJECTED: 3,
  REVERSAL_REASONS: [
    'Captured against the wrong control number',
    'Duplicate capture',
    'Customer refund approved',
    'Amount keyed incorrectly',
  ],
  OFFICER_EMAIL: 'officer@ircub.test',
  SUPERVISOR_EMAIL: 'supervisor@ircub.test',
  CUSTOMER_EMAIL: 'customer1@ircub.test',
  WATER_TYPE_CODE: 'WATER',
} as const;

/** Water demo data (D24): sizes, tariffs in USD-equivalent, and seasonality per month (Jan..Dec). */
export const WATER_DEMO = {
  PAYERS: 100,
  ACCOUNTS: 120,
  COMMERCIAL_EVERY: 5,
  MONTHS: 12,
  RELEASED_CYCLES: 3,
  ACCOUNT_PREFIX: 'WA',
  ACCOUNT_DIGITS: 8,
  METER_PREFIX: 'MTR-',
  METER_DIGITS: 6,
  METER_DIGITS_ON_DIAL: 6,
  DECIMAL_RADIX: 10,
  ROLLOVERS: 2,
  ABNORMAL: 3,
  ABNORMAL_MULTIPLIER: 3.5,
  ABNORMAL_THRESHOLD_PCT: 200,
  ABNORMAL_HISTORY_MONTHS: 3,
  REPLACEMENT_INITIAL: 100,
  REPLACEMENT_CONSUMPTION: 18,
  PAID_RATIO: 0.6,
  DUE_DAYS: 30,
  WATER_OFFICER_EMAIL: 'water@ircub.test',
  /** Dry season (Jan–Mar, Jul–Sep) uses more water than the rainy months. */
  SEASONALITY: [1.25, 1.3, 1.2, 0.9, 0.8, 0.85, 1.1, 1.2, 1.15, 0.9, 0.85, 1.0],
  TARIFFS: [
    {
      code: 'DOMESTIC',
      name: 'Domestic',
      fixedChargeUsd: '2.00',
      tiersUsd: [
        { from: 0, to: 10, rateUsd: '0.50' },
        { from: 10, to: 30, rateUsd: '0.90' },
        { from: 30, to: 60, rateUsd: '1.40' },
        { from: 60, to: null, rateUsd: '2.00' },
      ],
    },
    {
      code: 'COMMERCIAL',
      name: 'Commercial',
      fixedChargeUsd: '8.00',
      tiersUsd: [
        { from: 0, to: 20, rateUsd: '1.20' },
        { from: 20, to: 100, rateUsd: '1.80' },
        { from: 100, to: 300, rateUsd: '2.40' },
        { from: 300, to: null, rateUsd: '3.00' },
      ],
    },
  ],
} as const;

/** Online-channel demo payments (phase 4, D15/D16). */
export const CHANNEL_DEMO = {
  PAYMENTS: 300,
  HISTORY_DAYS: 60,
  USD_RATIO: 0.2,
  MIN_SHARE: 0.1,
  MAX_SHARE: 0.6,
  PERMANENTLY_FAILED: 2,
  FAILED: 3,
  /** Amount cents that trigger the mock scenarios (apps/mocks/CLAUDE.md). */
  FAILED_SUFFIX: '.99',
  NO_CALLBACK_STATUS_ERROR_SUFFIX: '.66',
  REF_LENGTH: 10,
  /** The seed registers the payments with the mocks so statements know them; short timeout. */
  MOCKS_TIMEOUT_MS: 2_000,
  SEED_STATEMENT_PATH: '/__seed-statement',
  /** First assessments are reserved for the sample CSV and e2e tests (see DEMO.RESERVED_UNPAID). */
  SKIP_OLDEST: DEMO.RESERVED_UNPAID,
} as const;
