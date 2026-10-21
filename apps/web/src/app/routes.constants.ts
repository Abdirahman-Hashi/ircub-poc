/** Every route path, declared once (standards §9). Components link via these, never literals. */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  PAYERS: '/payers',
  ASSESSMENTS: '/assessments',
  PAYMENTS: '/payments',
  WATER: '/water',
  FMIS: '/fmis',
  ADMIN: '/admin',
  AUDIT: '/audit',
  ME: '/me',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
