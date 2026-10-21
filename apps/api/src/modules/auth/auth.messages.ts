export const AUTH_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password.',
  ACCOUNT_LOCKED: 'Account is temporarily locked after too many failed logins.',
  MFA_REQUIRED: 'Multi-factor code required.',
  MFA_INVALID: 'The authentication code is invalid or expired.',
  MFA_NOT_ENROLLED: 'Multi-factor authentication is not set up for this account.',
  MFA_ALREADY_ENABLED: 'Multi-factor authentication is already enabled.',
  REFRESH_INVALID: 'Session has expired; please sign in again.',
  REFRESH_REUSED: 'Refresh token reuse detected; all sessions have been revoked.',
  PASSWORD_POLICY: 'Password does not meet the policy.',
  PASSWORD_REUSED: 'Password was used recently; choose a different one.',
  CURRENT_PASSWORD_WRONG: 'Current password is incorrect.',
} as const;
