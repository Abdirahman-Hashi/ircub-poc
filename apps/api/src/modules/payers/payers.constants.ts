export const PAYERS_API = {
  PATH: 'payers',
  DUPLICATES: 'duplicates',
  REVIEW: 'review',
  SUSPEND: 'suspend',
  REACTIVATE: 'reactivate',
  SORTABLE: ['name', 'tin', 'createdAt', 'status'] as const,
  /** Payments shown on the 360° profile. */
  PROFILE_PAYMENTS: 20,
  PROFILE_ASSESSMENTS: 100,
} as const;
