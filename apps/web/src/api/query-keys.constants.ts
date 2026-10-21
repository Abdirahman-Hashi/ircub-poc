/** TanStack Query keys, namespaced per feature. */
export const QUERY_KEYS = {
  health: ['health'] as const,
  me: ['auth', 'me'] as const,
} as const;
