/** Metadata keys read by the guards (phase 1). Declared now so `@Public()` exists for health/SSE. */
export const AUTH_METADATA = {
  IS_PUBLIC: 'auth:isPublic',
  REQUIRED_PERMISSION: 'auth:requiredPermission',
} as const;
