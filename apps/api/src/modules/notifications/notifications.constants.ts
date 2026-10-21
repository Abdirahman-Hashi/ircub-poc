/** Injection token for the outbound gateway (standards §3: external systems behind interfaces). */
export const NOTIFICATION_SENDER = Symbol('NOTIFICATION_SENDER');

export const NOTIFICATIONS_API = {
  PATH: 'notifications',
  /** Mock gateway endpoints relative to MOCKS_BASE_URL (apps/mocks/CLAUDE.md). */
  SMS_PATH: '/sms',
  EMAIL_PATH: '/email',
  /** Outbound HTTP timeout. */
  TIMEOUT_MS: 5_000,
  SORTABLE: ['createdAt', 'status', 'channel'] as const,
} as const;

export const NOTIFICATION_RELATED = {
  BILL: 'Bill',
  PAYMENT: 'Payment',
} as const;
