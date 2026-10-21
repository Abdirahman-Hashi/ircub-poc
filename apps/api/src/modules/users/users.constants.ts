export const USERS_API = {
  PATH: 'users',
  ROLES: 'roles',
  DEACTIVATE: 'deactivate',
  REACTIVATE: 'reactivate',
  RESET_PASSWORD: 'reset-password',
  SORTABLE: ['email', 'fullName', 'status', 'createdAt'] as const,
} as const;
