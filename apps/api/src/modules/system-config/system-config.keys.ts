import { Currency } from '@ircub/shared';

/**
 * Runtime-tunable business parameters (standards §1, D27). Each key has a typed value,
 * a default and a description; the seed inserts the defaults and the admin UI (phase 1)
 * edits them. Reading goes through `SystemConfigService.get(key)`, never a literal.
 */
export enum SystemConfigKey {
  LOCAL_CURRENCY = 'LOCAL_CURRENCY',

  PASSWORD_MIN_LENGTH = 'PASSWORD_MIN_LENGTH',
  PASSWORD_HISTORY_SIZE = 'PASSWORD_HISTORY_SIZE',
  PASSWORD_MAX_AGE_DAYS = 'PASSWORD_MAX_AGE_DAYS',
  LOGIN_MAX_FAILED_ATTEMPTS = 'LOGIN_MAX_FAILED_ATTEMPTS',
  LOGIN_LOCKOUT_MINUTES = 'LOGIN_LOCKOUT_MINUTES',

  CSV_MAX_ROWS = 'CSV_MAX_ROWS',
  PHONE_DEFAULT_COUNTRY_CODE = 'PHONE_DEFAULT_COUNTRY_CODE',
  ASSESSMENT_DEFAULT_DUE_DAYS = 'ASSESSMENT_DEFAULT_DUE_DAYS',

  ABNORMAL_CONSUMPTION_THRESHOLD_PCT = 'ABNORMAL_CONSUMPTION_THRESHOLD_PCT',
  ABNORMAL_CONSUMPTION_HISTORY_MONTHS = 'ABNORMAL_CONSUMPTION_HISTORY_MONTHS',
  BILL_DUE_DAYS = 'BILL_DUE_DAYS',
  BILL_NOTIFICATION_SMS = 'BILL_NOTIFICATION_SMS',
  BILL_NOTIFICATION_EMAIL = 'BILL_NOTIFICATION_EMAIL',

  PAYMENT_STATUS_RETRY_LIMIT = 'PAYMENT_STATUS_RETRY_LIMIT',
  PAYMENT_STATUS_CHECK_DELAY_SECONDS = 'PAYMENT_STATUS_CHECK_DELAY_SECONDS',
  PAYMENT_STATUS_RETRY_DELAY_SECONDS = 'PAYMENT_STATUS_RETRY_DELAY_SECONDS',
  FX_REFRESH_MINUTES = 'FX_REFRESH_MINUTES',
  FX_STALE_AFTER_MINUTES = 'FX_STALE_AFTER_MINUTES',

  CASH_GL_CODE = 'CASH_GL_CODE',
  FMIS_POST_RETRY_LIMIT = 'FMIS_POST_RETRY_LIMIT',
  FMIS_POST_RETRY_DELAY_SECONDS = 'FMIS_POST_RETRY_DELAY_SECONDS',
  FMIS_CATCH_UP_DAYS = 'FMIS_CATCH_UP_DAYS',

  ANOMALY_Z_WARNING = 'ANOMALY_Z_WARNING',
  ANOMALY_Z_CRITICAL = 'ANOMALY_Z_CRITICAL',
  ANOMALY_TRAILING_DAYS = 'ANOMALY_TRAILING_DAYS',
  FORECAST_HISTORY_MONTHS = 'FORECAST_HISTORY_MONTHS',
  FORECAST_HORIZON_MONTHS = 'FORECAST_HORIZON_MONTHS',
}

/** Value type of each key; `SystemConfigService.get` is generic over this map. */
export interface SystemConfigValues {
  [SystemConfigKey.LOCAL_CURRENCY]: Currency;

  [SystemConfigKey.PASSWORD_MIN_LENGTH]: number;
  [SystemConfigKey.PASSWORD_HISTORY_SIZE]: number;
  [SystemConfigKey.PASSWORD_MAX_AGE_DAYS]: number;
  [SystemConfigKey.LOGIN_MAX_FAILED_ATTEMPTS]: number;
  [SystemConfigKey.LOGIN_LOCKOUT_MINUTES]: number;

  [SystemConfigKey.CSV_MAX_ROWS]: number;
  [SystemConfigKey.PHONE_DEFAULT_COUNTRY_CODE]: string;
  [SystemConfigKey.ASSESSMENT_DEFAULT_DUE_DAYS]: number;

  [SystemConfigKey.ABNORMAL_CONSUMPTION_THRESHOLD_PCT]: number;
  [SystemConfigKey.ABNORMAL_CONSUMPTION_HISTORY_MONTHS]: number;
  [SystemConfigKey.BILL_DUE_DAYS]: number;
  [SystemConfigKey.BILL_NOTIFICATION_SMS]: boolean;
  [SystemConfigKey.BILL_NOTIFICATION_EMAIL]: boolean;

  [SystemConfigKey.PAYMENT_STATUS_RETRY_LIMIT]: number;
  [SystemConfigKey.PAYMENT_STATUS_CHECK_DELAY_SECONDS]: number;
  [SystemConfigKey.PAYMENT_STATUS_RETRY_DELAY_SECONDS]: number;
  [SystemConfigKey.FX_REFRESH_MINUTES]: number;
  [SystemConfigKey.FX_STALE_AFTER_MINUTES]: number;

  [SystemConfigKey.CASH_GL_CODE]: string;
  [SystemConfigKey.FMIS_POST_RETRY_LIMIT]: number;
  [SystemConfigKey.FMIS_POST_RETRY_DELAY_SECONDS]: number;
  [SystemConfigKey.FMIS_CATCH_UP_DAYS]: number;

  [SystemConfigKey.ANOMALY_Z_WARNING]: number;
  [SystemConfigKey.ANOMALY_Z_CRITICAL]: number;
  [SystemConfigKey.ANOMALY_TRAILING_DAYS]: number;
  [SystemConfigKey.FORECAST_HISTORY_MONTHS]: number;
  [SystemConfigKey.FORECAST_HORIZON_MONTHS]: number;
}

/** Defaults from docs/DECISIONS.md (D5, D12, D13, D14, D15, D17, D18). */
export const SYSTEM_CONFIG_DEFAULTS: Readonly<SystemConfigValues> = {
  [SystemConfigKey.LOCAL_CURRENCY]: Currency.SOS,

  [SystemConfigKey.PASSWORD_MIN_LENGTH]: 10,
  [SystemConfigKey.PASSWORD_HISTORY_SIZE]: 5,
  [SystemConfigKey.PASSWORD_MAX_AGE_DAYS]: 90,
  [SystemConfigKey.LOGIN_MAX_FAILED_ATTEMPTS]: 5,
  [SystemConfigKey.LOGIN_LOCKOUT_MINUTES]: 15,

  [SystemConfigKey.CSV_MAX_ROWS]: 10_000,
  [SystemConfigKey.PHONE_DEFAULT_COUNTRY_CODE]: '+252',
  [SystemConfigKey.ASSESSMENT_DEFAULT_DUE_DAYS]: 30,

  [SystemConfigKey.ABNORMAL_CONSUMPTION_THRESHOLD_PCT]: 200,
  [SystemConfigKey.ABNORMAL_CONSUMPTION_HISTORY_MONTHS]: 3,
  [SystemConfigKey.BILL_DUE_DAYS]: 30,
  [SystemConfigKey.BILL_NOTIFICATION_SMS]: true,
  [SystemConfigKey.BILL_NOTIFICATION_EMAIL]: true,

  [SystemConfigKey.PAYMENT_STATUS_RETRY_LIMIT]: 3,
  [SystemConfigKey.PAYMENT_STATUS_CHECK_DELAY_SECONDS]: 60,
  [SystemConfigKey.PAYMENT_STATUS_RETRY_DELAY_SECONDS]: 60,
  [SystemConfigKey.FX_REFRESH_MINUTES]: 15,
  [SystemConfigKey.FX_STALE_AFTER_MINUTES]: 60,

  [SystemConfigKey.CASH_GL_CODE]: '1010',
  [SystemConfigKey.FMIS_POST_RETRY_LIMIT]: 3,
  [SystemConfigKey.FMIS_POST_RETRY_DELAY_SECONDS]: 30,
  [SystemConfigKey.FMIS_CATCH_UP_DAYS]: 31,

  [SystemConfigKey.ANOMALY_Z_WARNING]: 2,
  [SystemConfigKey.ANOMALY_Z_CRITICAL]: 3,
  [SystemConfigKey.ANOMALY_TRAILING_DAYS]: 30,
  [SystemConfigKey.FORECAST_HISTORY_MONTHS]: 12,
  [SystemConfigKey.FORECAST_HORIZON_MONTHS]: 3,
};

export const SYSTEM_CONFIG_DESCRIPTIONS: Readonly<Record<SystemConfigKey, string>> = {
  [SystemConfigKey.LOCAL_CURRENCY]: 'Currency assessments and bills are denominated in.',

  [SystemConfigKey.PASSWORD_MIN_LENGTH]: 'Minimum password length.',
  [SystemConfigKey.PASSWORD_HISTORY_SIZE]: 'Number of previous passwords a user may not reuse.',
  [SystemConfigKey.PASSWORD_MAX_AGE_DAYS]:
    'Days after which a password change is recommended (warn only).',
  [SystemConfigKey.LOGIN_MAX_FAILED_ATTEMPTS]: 'Failed logins before the account is locked.',
  [SystemConfigKey.LOGIN_LOCKOUT_MINUTES]:
    'Minutes an account stays locked after too many failures.',

  [SystemConfigKey.CSV_MAX_ROWS]: 'Maximum rows accepted in one bulk upload.',
  [SystemConfigKey.PHONE_DEFAULT_COUNTRY_CODE]:
    'Country code prepended to phone numbers entered without one (E.164).',
  [SystemConfigKey.ASSESSMENT_DEFAULT_DUE_DAYS]:
    'Days after creation an assessment falls due when no due date is given.',

  [SystemConfigKey.ABNORMAL_CONSUMPTION_THRESHOLD_PCT]:
    'Consumption above this percentage of the trailing average is flagged as abnormal.',
  [SystemConfigKey.ABNORMAL_CONSUMPTION_HISTORY_MONTHS]:
    'Number of previous monthly consumptions averaged for the abnormal check.',
  [SystemConfigKey.BILL_DUE_DAYS]: 'Days after bill release until the bill is due.',
  [SystemConfigKey.BILL_NOTIFICATION_SMS]: 'Send an SMS to the payer when a bill is released.',
  [SystemConfigKey.BILL_NOTIFICATION_EMAIL]: 'Send an email to the payer when a bill is released.',

  [SystemConfigKey.PAYMENT_STATUS_RETRY_LIMIT]:
    'Status-check attempts before a pending payment is marked permanently failed.',
  [SystemConfigKey.PAYMENT_STATUS_CHECK_DELAY_SECONDS]:
    'Seconds to wait for a channel callback before the first status check.',
  [SystemConfigKey.PAYMENT_STATUS_RETRY_DELAY_SECONDS]:
    'Base delay between status-check retries (exponential backoff).',
  [SystemConfigKey.FX_REFRESH_MINUTES]: 'How often the FX rate is refreshed from the provider.',
  [SystemConfigKey.FX_STALE_AFTER_MINUTES]:
    'A stored rate older than this is reported as stale when the provider is down.',

  [SystemConfigKey.CASH_GL_CODE]: 'General ledger code debited for every collection.',
  [SystemConfigKey.FMIS_POST_RETRY_LIMIT]:
    'Posting attempts before a journal batch is marked FAILED.',
  [SystemConfigKey.FMIS_POST_RETRY_DELAY_SECONDS]:
    'Base delay between FMIS posting retries (exponential backoff).',
  [SystemConfigKey.FMIS_CATCH_UP_DAYS]:
    'Days before a batch date whose still-unposted confirmed payments the batch also sweeps (late callbacks, back-dated captures).',

  [SystemConfigKey.ANOMALY_Z_WARNING]: 'Absolute z-score that raises a WARNING alert.',
  [SystemConfigKey.ANOMALY_Z_CRITICAL]: 'Absolute z-score that raises a CRITICAL alert.',
  [SystemConfigKey.ANOMALY_TRAILING_DAYS]: 'Trailing window (days) for anomaly baselines.',
  [SystemConfigKey.FORECAST_HISTORY_MONTHS]: 'Monthly totals fed into the regression forecast.',
  [SystemConfigKey.FORECAST_HORIZON_MONTHS]: 'Months projected by the forecast.',
};
