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
  PAYER_NEW: '/payers/new',
  PAYER_DUPLICATES: '/payers/duplicates',
  PAYER_DETAIL: '/payers/$payerId',
  REVENUE_TYPES: '/revenue-types',
  ASSESSMENTS: '/assessments',
  ASSESSMENT_NEW: '/assessments/new',
  PAYMENTS: '/payments',
  PAYMENT_CAPTURE: '/payments/capture',
  BULK_UPLOADS: '/bulk-uploads',
  REVERSALS: '/reversals',
  WATER: '/water',
  WATER_ACCOUNT_DETAIL: '/water/$accountId',
  WATER_READINGS: '/water/readings',
  WATER_READINGS_NEW: '/water/readings/new',
  WATER_READINGS_UPLOAD: '/water/readings/upload',
  WATER_CYCLES: '/water/cycles',
  WATER_CYCLE_DETAIL: '/water/cycles/$cycleId',
  WATER_TARIFFS: '/water/tariffs',
  FX: '/fx',
  RECONCILIATION: '/reconciliation',
  RECONCILIATION_RUN: '/reconciliation/$runId',
  DEMO: '/demo',
  FMIS: '/fmis',
  AUDIT: '/audit',
  ME: '/me',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

/** Routes without path parameters — the only ones a nav item may point at. */
export type StaticRoutePath = Exclude<RoutePath, `${string}$${string}`>;
