/** Every route path, declared once (standards §9). Components link via these, never literals. */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  FORBIDDEN: '/403',
  ACCOUNT_PASSWORD: '/account/password',
  ACCOUNT_MFA: '/account/mfa',
  ADMIN_USERS: '/admin/users',
  ADMIN_ROLES: '/admin/roles',
  ADMIN_SOD: '/admin/sod-rules',
  ADMIN_CONFIG: '/admin/config',
  DASHBOARD: '/dashboard',
  PAYERS: '/payers',
  ASSESSMENTS: '/assessments',
  PAYMENTS: '/payments',
  WATER: '/water',
  FMIS: '/fmis',
  AUDIT: '/audit',
  ME: '/me',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
