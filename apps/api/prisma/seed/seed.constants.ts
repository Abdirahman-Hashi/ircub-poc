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
