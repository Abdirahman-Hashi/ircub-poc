export const REVERSALS_API = {
  PATH: 'reversals',
  APPROVE: 'approve',
  REJECT: 'reject',
  SORTABLE: ['createdAt', 'status', 'decidedAt'] as const,
} as const;
