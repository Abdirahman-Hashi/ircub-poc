import { PaymentChannel, PaymentStatus } from '@ircub/shared';

export const ONLINE_CHANNELS = [PaymentChannel.BANK, PaymentChannel.MOBILE_MONEY] as const;

export { LOCAL_CURRENCY } from '../../lib/currency.constants';

export const MONEY_DECIMALS = 2;

/** Statuses that mean the channel is still working on the payment. */
export const IN_FLIGHT_STATUSES: readonly PaymentStatus[] = [
  PaymentStatus.INITIATED,
  PaymentStatus.PENDING,
];

export const LIVE_STATUS_COLORS: Readonly<Record<string, string>> = {
  [PaymentStatus.CONFIRMED]: 'teal',
  [PaymentStatus.FAILED]: 'red',
  [PaymentStatus.PERMANENTLY_FAILED]: 'red',
  [PaymentStatus.PENDING]: 'yellow',
};

export const DEFAULT_LIVE_STATUS_COLOR = 'gray';
