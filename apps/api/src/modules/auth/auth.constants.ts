export const AUTH_API = {
  PATH: 'auth',
  LOGIN: 'login',
  MFA_VERIFY: 'mfa/verify',
  MFA_ENROL: 'mfa/enrol',
  MFA_CONFIRM: 'mfa/confirm',
  MFA_DISABLE: 'mfa/disable',
  REFRESH: 'refresh',
  LOGOUT: 'logout',
  ME: 'me',
  CHANGE_PASSWORD: 'change-password',
  /** Refresh cookie is only sent to /auth/* so it never rides along on API calls. */
  COOKIE_PATH: '/auth',
  SAME_SITE: 'lax',
} as const;

export const AUTH = {
  /** Window in which an MFA code must follow a password login. */
  MFA_CHALLENGE_TTL_SECONDS: 300,
  /** Shown in authenticator apps. */
  TOTP_ISSUER: 'IRCUB',
  /** Opaque refresh token entropy. */
  REFRESH_TOKEN_BYTES: 48,
  REFRESH_TOKEN_ENCODING: 'base64url',
  REFRESH_TOKEN_HASH_ALGORITHM: 'sha256',
  /** Temporary passwords generated for new users / resets. */
  TEMP_PASSWORD_RANDOM_LENGTH: 12,
  MS_PER_SECOND: 1000,
  MS_PER_MINUTE: 60_000,
  MS_PER_DAY: 86_400_000,
} as const;

/** Password policy character classes (D5). */
export const PASSWORD_RULES = {
  UPPER: /[A-Z]/,
  LOWER: /[a-z]/,
  DIGIT: /[0-9]/,
  SYMBOL: /[^A-Za-z0-9]/,
} as const;

export const PASSWORD_VIOLATION = {
  TOO_SHORT: 'TOO_SHORT',
  NO_UPPERCASE: 'NO_UPPERCASE',
  NO_LOWERCASE: 'NO_LOWERCASE',
  NO_DIGIT: 'NO_DIGIT',
  NO_SYMBOL: 'NO_SYMBOL',
} as const;

/** Character pools for generated temporary passwords; one from each class guarantees policy. */
export const TEMP_PASSWORD_POOLS = {
  UPPER: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  LOWER: 'abcdefghijkmnpqrstuvwxyz',
  DIGIT: '23456789',
  SYMBOL: '!@#$%&*?',
} as const;

/**
 * Per-IP throttle for credential endpoints (standards §5). Limits are per source address, and
 * an office behind one NAT shares an address, so refresh (called on every hard reload) is
 * generous; brute-force protection on login comes mainly from the per-account lockout.
 */
export const AUTH_THROTTLE = {
  LOGIN: { ttl: 60_000, limit: 20 },
  REFRESH: { ttl: 60_000, limit: 120 },
} as const;
