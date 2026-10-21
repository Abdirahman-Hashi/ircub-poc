export const PAYMENTS_API = {
  PATH: 'payments',
  CAPTURE: 'capture',
  LOOKUP: 'lookup',
  SORTABLE: ['createdAt', 'paidAt', 'localAmount', 'status', 'channel'] as const,
} as const;

/** Channels a cashier may record by hand; online channels are initiated in phase 4. */
export const MANUAL_CHANNELS = ['CASH', 'BANK', 'MOBILE_MONEY'] as const;
