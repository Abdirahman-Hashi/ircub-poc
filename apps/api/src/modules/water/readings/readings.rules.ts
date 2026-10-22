import { ReadingType } from '@ircub/shared';

import { WATER } from '../water.constants';

import type { AbnormalResult, ConsumptionResult, ReadingContext } from '../water.types';

/**
 * D13: NORMAL readings must not go backwards; ROLLOVER wraps past the dial's capacity
 * (`10^maxDigits`); REPLACEMENT counts from the new meter's initial reading.
 * A ROLLOVER is only plausible when the dial actually wrapped: the new value must be below
 * the previous one and within the dial's capacity, otherwise a mislabelled normal reading
 * would be billed for a whole dial of water.
 */
export function computeConsumption(context: ReadingContext): ConsumptionResult {
  const { previousReading, currentReading, type, meter } = context;
  switch (type) {
    case ReadingType.ROLLOVER: {
      const capacity = WATER.DECIMAL_RADIX ** meter.maxDigits;
      if (currentReading >= previousReading || currentReading >= capacity) {
        return { ok: false, reason: 'READING_INVALID_ROLLOVER' };
      }
      return { ok: true, consumption: capacity - previousReading + currentReading };
    }
    case ReadingType.REPLACEMENT:
      if (currentReading < meter.initialReading) {
        return { ok: false, reason: 'READING_BELOW_PREVIOUS' };
      }
      return { ok: true, consumption: currentReading - meter.initialReading };
    default:
      if (currentReading < previousReading) {
        return { ok: false, reason: 'READING_BELOW_PREVIOUS' };
      }
      return { ok: true, consumption: currentReading - previousReading };
  }
}

/**
 * Abnormal when consumption exceeds `thresholdPct` % of the mean of the previous
 * `historyMonths` monthly consumptions (strictly greater: exactly 200 % is not flagged).
 * With no history nothing is flagged; with fewer months, the available ones are averaged.
 */
export function evaluateAbnormal(
  consumption: number,
  history: readonly number[],
  thresholdPct: number,
  historyMonths: number,
): AbnormalResult {
  const window = history.slice(0, historyMonths);
  if (window.length === 0) {
    return { abnormal: false, reason: null, mean: null };
  }
  const mean = window.reduce((sum, value) => sum + value, 0) / window.length;
  const limit = (mean * thresholdPct) / WATER.PERCENT;
  if (consumption > limit) {
    return {
      abnormal: true,
      reason: `Consumption ${consumption} exceeds ${thresholdPct}% of the ${window.length}-month average ${mean.toFixed(1)} (limit ${limit.toFixed(1)})`,
      mean,
    };
  }
  return { abnormal: false, reason: null, mean };
}
