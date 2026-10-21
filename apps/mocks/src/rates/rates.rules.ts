import { Currency } from '@ircub/shared';

import { FX } from '../mocks.constants';

import type { RandomSource, RateTable } from './rates.types';

const PERCENT = 100;
const SIGN_RANGE = 2;
const DECIMAL_BASE = 10;
const SCALE_FACTOR = DECIMAL_BASE ** FX.RATE_SCALE;

function roundToScale(value: number): number {
  return Math.round(value * SCALE_FACTOR) / SCALE_FACTOR;
}

/**
 * Applies a symmetric random drift of up to ±driftPct to every rate except the base
 * currency, which stays exactly 1. Pure: the random source is a parameter.
 */
export function driftRates(
  base: Currency,
  rates: RateTable,
  driftPct: number,
  random: RandomSource,
): RateTable {
  const drifted = { ...rates };
  for (const code of Object.values(Currency)) {
    if (code === base) {
      drifted[code] = 1;
      continue;
    }
    const signedUnit = random() * SIGN_RANGE - 1;
    const multiplier = 1 + (signedUnit * driftPct) / PERCENT;
    drifted[code] = roundToScale(rates[code] * multiplier);
  }
  return drifted;
}

/**
 * Re-expresses a USD-based table in another base currency, so `?base=SOS` returns
 * `{ SOS: 1, USD: 1/571.5 }`.
 */
export function rebase(rates: RateTable, newBase: Currency): RateTable {
  const divisor = rates[newBase];
  const rebased = { ...rates };
  for (const code of Object.values(Currency)) {
    rebased[code] = roundToScale(rates[code] / divisor);
  }
  return rebased;
}
