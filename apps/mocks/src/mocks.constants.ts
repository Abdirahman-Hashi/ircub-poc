import { Currency } from '@ircub/shared';

export const MOCKS_APP = {
  NAME: 'IRCUB Mock External Services',
  AUTHOR: 'Abdirahman Hashi',
  DESCRIPTION:
    'Stand-ins for FX rates, bank, mobile money, FMIS and SMS/email. In-memory only; ' +
    'POST /__reset clears state.',
  SWAGGER_PATH: 'docs',
  VERSION: '0.1.0',
  PRETTY_LOG_TARGET: 'pino-pretty',
} as const;

/** FX (apps/mocks/CLAUDE.md): base rates drift ±DRIFT_PCT on every call so "dynamic" is visible. */
export const FX = {
  DEFAULT_BASE: Currency.USD,
  BASE_RATES: {
    [Currency.USD]: 1,
    [Currency.SOS]: 571.5,
  },
  DRIFT_PCT: 0.5,
  /** Rates are quoted to 6 decimals, matching Decimal(18,6) in the API (D9). */
  RATE_SCALE: 6,
  /** Query flag that forces a 503, for the API's FX_RATE_UNAVAILABLE path. */
  FAIL_FLAG: '1',
} as const;

/** Transaction reference prefixes per channel (phase 4). */
export const CHANNEL_PREFIX = {
  BANK: 'BNK-',
  MOBILE_MONEY: 'MM-',
} as const;

/** Amount suffixes that trigger demo scenarios without the control endpoint (phase 4). */
export const SCENARIO_SUFFIX = {
  FAILED: '.99',
  NO_CALLBACK: '.77',
  NO_CALLBACK_STATUS_ERROR: '.66',
} as const;

export const PATHS = {
  HEALTH: 'health',
  RATES: 'rates',
  RESET: '__reset',
  SCENARIO: '__scenario',
  SMS: 'sms',
  EMAIL: 'email',
  OUTBOX: 'outbox',
} as const;

export const NOTIFICATION_CHANNEL = {
  SMS: 'SMS',
  EMAIL: 'EMAIL',
  ACCEPTED: 'accepted',
  MESSAGE_PREFIX: 'msg-',
} as const;
