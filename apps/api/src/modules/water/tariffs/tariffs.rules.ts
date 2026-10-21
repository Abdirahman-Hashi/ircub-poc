import { Decimal } from 'decimal.js';

import { roundMoney, toDecimal } from '../../../common/money/money.rules';
import { TIER_VALIDATION } from '../water.constants';

import type { TierChargeLine, TieredCharge, TierInput, TierValidationError } from '../water.types';

/**
 * Tiers are inclusive-exclusive unit bands `[from, to)` that must start at 0, be contiguous
 * and non-overlapping, and end with one open-ended band (D14).
 */
export function validateTiers(tiers: readonly TierInput[]): TierValidationError[] {
  const errors: TierValidationError[] = [];
  if (tiers.length === 0) {
    return [{ code: TIER_VALIDATION.NO_TIERS, index: 0 }];
  }
  const sorted = [...tiers].sort((a, b) => a.fromUnit - b.fromUnit);
  if (sorted[0]?.fromUnit !== 0) {
    errors.push({ code: TIER_VALIDATION.NOT_STARTING_AT_ZERO, index: 0 });
  }
  sorted.forEach((tier, index) => {
    if (toDecimal(tier.ratePerUnit).lt(0)) {
      errors.push({ code: TIER_VALIDATION.NEGATIVE_RATE, index });
    }
    if (tier.toUnit !== null && tier.toUnit <= tier.fromUnit) {
      errors.push({ code: TIER_VALIDATION.EMPTY_BAND, index });
    }
    const next = sorted[index + 1];
    if (next === undefined) {
      if (tier.toUnit !== null) {
        errors.push({ code: TIER_VALIDATION.LAST_NOT_OPEN_ENDED, index });
      }
    } else if (tier.toUnit !== next.fromUnit) {
      errors.push({ code: TIER_VALIDATION.GAP_OR_OVERLAP, index });
    }
  });
  return errors;
}

/** Splits consumption across the bands; each band's units × rate, rounded per line and summed. */
export function computeTieredCharge(
  consumption: number,
  tiers: readonly TierInput[],
): TieredCharge {
  const sorted = [...tiers].sort((a, b) => a.fromUnit - b.fromUnit);
  const lines: TierChargeLine[] = [];
  let remaining = Math.max(0, consumption);
  let consumptionCharge = new Decimal(0);
  for (const tier of sorted) {
    if (remaining <= 0) {
      break;
    }
    const width = tier.toUnit === null ? remaining : tier.toUnit - tier.fromUnit;
    const units = Math.min(remaining, width);
    const rate = toDecimal(tier.ratePerUnit);
    const amount = roundMoney(rate.mul(units));
    lines.push({ from: tier.fromUnit, to: tier.toUnit, units, rate, amount });
    consumptionCharge = consumptionCharge.plus(amount);
    remaining -= units;
  }
  return { lines, consumptionCharge: roundMoney(consumptionCharge) };
}
