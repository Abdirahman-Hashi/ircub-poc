/** TanStack Query keys, namespaced per feature. */
export const QUERY_KEYS = {
  health: ['health'] as const,
  me: ['auth', 'me'] as const,
  users: (params: unknown) => ['users', params] as const,
  roles: ['roles'] as const,
  permissions: ['permissions'] as const,
  sodRules: ['sod-rules'] as const,
  config: ['config'] as const,
} as const;
