export const PAYMENTS_API = {
  PATH: 'payments',
  CAPTURE: 'capture',
  LOOKUP: 'lookup',
  INITIATE: 'initiate',
  CALLBACK: 'callback',
  SORTABLE: ['createdAt', 'paidAt', 'localAmount', 'status', 'channel'] as const,
} as const;

/** Stricter throttle for the public callback endpoint. */
export const CALLBACK_THROTTLE = { ttl: 60_000, limit: 600 } as const;

export const ONLINE_CHANNELS = ['BANK', 'MOBILE_MONEY'] as const;

/** Subject/body templates for the supervisor escalation e-mail (D15). */
export const ESCALATION_EMAIL = {
  SUBJECT: 'Payment permanently failed',
  BODY: (controlNumber: string, channel: string, attempts: number): string =>
    `Payment for control number ${controlNumber} via ${channel} could not be confirmed after ${attempts} status checks. Please review it in IRCUB.`,
} as const;

/** Channels a cashier may record by hand; online channels are initiated through ChannelClient. */
export const MANUAL_CHANNELS = ['CASH', 'BANK', 'MOBILE_MONEY'] as const;
