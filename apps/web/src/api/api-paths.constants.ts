/** API routes the web calls, declared once (standards §9). */
export const API_PATHS = {
  HEALTH: '/health',
  READY: '/ready',
  EVENTS: '/events',
  AUTH_LOGIN: '/auth/login',
  AUTH_REFRESH: '/auth/refresh',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_ME: '/auth/me',
} as const;
