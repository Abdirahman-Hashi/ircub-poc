import type { TariffTierInput } from '../../api/types/water.types';

const MONEY = /^[0-9]+(\.[0-9]{1,2})?$/;
const NEXT_BAND_OFFSET = 2;

/** Client-side mirror of the server's tier validation so the editor can explain problems inline. */
export function tierErrors(tiers: readonly TariffTierInput[]): string[] {
  const errors: string[] = [];
  const sorted = [...tiers].sort((a, b) => a.fromUnit - b.fromUnit);
  if (sorted[0]?.fromUnit !== 0) {
    errors.push('First band must start at 0');
  }
  sorted.forEach((tier, index) => {
    const next = sorted[index + 1];
    if (!MONEY.test(tier.ratePerUnit)) {
      errors.push(`Band ${index + 1}: rate must be a decimal`);
    }
    if (tier.toUnit !== null && tier.toUnit <= tier.fromUnit) {
      errors.push(`Band ${index + 1}: "to" must be greater than "from"`);
    }
    if (next === undefined) {
      if (tier.toUnit !== null) {
        errors.push('Last band must be open-ended');
      }
    } else if (tier.toUnit !== next.fromUnit) {
      errors.push(`Bands ${index + 1} and ${index + NEXT_BAND_OFFSET} must be contiguous`);
    }
  });
  return errors;
}
