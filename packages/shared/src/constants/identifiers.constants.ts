/**
 * Identifier formats (docs/DECISIONS.md D10). Generators and validators live in
 * apps/api/src/common/ids; the web uses these for input masks and client-side checks.
 */
export const TIN = {
  PREFIX: 'TIN',
  /** Digits after the prefix, excluding the check digit. */
  BODY_DIGITS: 9,
  CHECK_DIGITS: 1,
  CHECK_MODULUS: 11,
} as const;

export const CONTROL_NUMBER = {
  /** Total length including the two check digits. */
  LENGTH: 12,
  CHECK_DIGITS: 2,
  CHECK_MODULUS: 97,
} as const;

export const WATER_ACCOUNT_NUMBER = {
  PREFIX: 'WA',
  BODY_DIGITS: 8,
} as const;

export const METER = {
  DEFAULT_MAX_DIGITS: 6,
  DEFAULT_INITIAL_READING: 0,
} as const;
