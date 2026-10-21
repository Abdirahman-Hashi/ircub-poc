import { Decimal } from 'decimal.js';

import {
  AMOUNT_SCALE,
  MONEY_ROUNDING,
  PERCENT_DIVISOR,
  RATE_SCALE,
  UNIT_RATE,
} from './money.constants';

import type { DecimalLike, LocalConversion } from './money.types';

/** Prisma `Decimal`, strings and numbers all become decimal.js instances via their string form. */
export function toDecimal(value: DecimalLike): Decimal {
  return value instanceof Decimal ? value : new Decimal(value.toString());
}

export function roundMoney(value: DecimalLike): Decimal {
  return toDecimal(value).toDecimalPlaces(AMOUNT_SCALE, MONEY_ROUNDING);
}

export function roundRate(value: DecimalLike): Decimal {
  return toDecimal(value).toDecimalPlaces(RATE_SCALE, MONEY_ROUNDING);
}

/** Foreign amount × rate, rounded once at the end (D9). Local currency uses rate 1. */
export function convertToLocal(
  amount: DecimalLike,
  rate: DecimalLike = UNIT_RATE,
): LocalConversion {
  const fxRate = roundRate(rate);
  return { localAmount: roundMoney(toDecimal(amount).mul(fxRate)), fxRate };
}

export function percentOf(base: DecimalLike, percent: DecimalLike): Decimal {
  return roundMoney(toDecimal(base).mul(toDecimal(percent)).div(PERCENT_DIVISOR));
}

export function isPositive(value: DecimalLike): boolean {
  return toDecimal(value).gt(0);
}
