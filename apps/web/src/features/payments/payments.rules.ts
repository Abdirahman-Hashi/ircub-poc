import { PaymentStatus } from '@ircub/shared';

import {
  DEFAULT_LIVE_STATUS_COLOR,
  IN_FLIGHT_STATUSES,
  LIVE_STATUS_COLORS,
  MONEY_DECIMALS,
} from './payments.constants';

import type { LiveStatusNotice } from './payments.types';
import type { PaymentUpdatedEvent } from '../../lib/live-events.types';

const HALF = 0.5;
const EVEN_DIVISOR = 2;
/** Significant digits kept before testing for a tie, to drop binary floating-point noise. */
const TIE_PRECISION = 12;
const BASE = 10;

/** Banker's rounding to `decimals`, matching the API's HALF_EVEN money rounding (D9). */
export function roundHalfEven(value: number, decimals: number): number {
  const factor = BASE ** decimals;
  const scaled = Number((value * factor).toPrecision(TIE_PRECISION));
  const floor = Math.floor(scaled);
  const isHalf = scaled - floor === HALF;
  if (isHalf) {
    return (floor % EVEN_DIVISOR === 0 ? floor : floor + 1) / factor;
  }
  return Math.round(scaled) / factor;
}

/**
 * Client-side preview of the local amount for the initiation dialog. The server converts
 * again with the stored rate and is authoritative; this only shows the payer what to expect.
 */
export function previewLocalAmount(
  amount: string,
  currency: string,
  localCurrency: string,
  rate: string | null,
): string | null {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  if (currency === localCurrency) {
    return roundHalfEven(value, MONEY_DECIMALS).toFixed(MONEY_DECIMALS);
  }
  if (rate === null) {
    return null;
  }
  return roundHalfEven(value * Number(rate), MONEY_DECIMALS).toFixed(MONEY_DECIMALS);
}

export function isInFlight(status: PaymentStatus): boolean {
  return IN_FLIGHT_STATUSES.includes(status);
}

/** Toast text for a live status change; failures carry the channel's reason. */
export function describeStatusChange(event: PaymentUpdatedEvent): LiveStatusNotice | null {
  if (isInFlight(event.status)) {
    return null;
  }
  const base = `Payment for ${event.controlNumber} is ${event.status.replace(/_/g, ' ')}`;
  const message =
    event.failureReason === null || event.status === PaymentStatus.CONFIRMED
      ? base
      : `${base}: ${event.failureReason}`;
  return { color: LIVE_STATUS_COLORS[event.status] ?? DEFAULT_LIVE_STATUS_COLOR, message };
}
