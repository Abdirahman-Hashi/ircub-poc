/** Metadata keys read by the guards. */
export const AUTH_METADATA = {
  IS_PUBLIC: 'auth:isPublic',
  REQUIRED_PERMISSIONS: 'auth:requiredPermissions',
} as const;

export const JWT_STRATEGY_NAME = 'jwt';

/** `purpose` claim so an MFA challenge token can never be used as an access token. */
export const TOKEN_PURPOSE = {
  ACCESS: 'access',
  MFA_CHALLENGE: 'mfa',
} as const;
