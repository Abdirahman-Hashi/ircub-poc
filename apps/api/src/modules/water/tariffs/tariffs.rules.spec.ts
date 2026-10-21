import { TIER_VALIDATION } from '../water.constants';

import { computeTieredCharge, validateTiers } from './tariffs.rules';

const DOMESTIC = [
  { fromUnit: 0, toUnit: 10, ratePerUnit: '285.75' },
  { fromUnit: 10, toUnit: 30, ratePerUnit: '514.35' },
  { fromUnit: 30, toUnit: 60, ratePerUnit: '800.10' },
  { fromUnit: 60, toUnit: null, ratePerUnit: '1143.00' },
];

describe('validateTiers', () => {
  it('accepts a contiguous set starting at 0 with an open last band', () => {
    expect(validateTiers(DOMESTIC)).toEqual([]);
    expect(validateTiers([...DOMESTIC].reverse())).toEqual([]);
  });

  it('rejects not starting at zero, gaps, overlaps, empty bands, closed last band and negatives', () => {
    expect(
      validateTiers([{ fromUnit: 5, toUnit: null, ratePerUnit: '1' }]).map((e) => e.code),
    ).toEqual([TIER_VALIDATION.NOT_STARTING_AT_ZERO]);
    expect(
      validateTiers([
        { fromUnit: 0, toUnit: 10, ratePerUnit: '1' },
        { fromUnit: 12, toUnit: null, ratePerUnit: '1' },
      ]).map((e) => e.code),
    ).toEqual([TIER_VALIDATION.GAP_OR_OVERLAP]);
    expect(
      validateTiers([
        { fromUnit: 0, toUnit: 10, ratePerUnit: '1' },
        { fromUnit: 8, toUnit: null, ratePerUnit: '1' },
      ]).map((e) => e.code),
    ).toEqual([TIER_VALIDATION.GAP_OR_OVERLAP]);
    expect(
      validateTiers([
        { fromUnit: 0, toUnit: 0, ratePerUnit: '1' },
        { fromUnit: 0, toUnit: null, ratePerUnit: '1' },
      ]).map((e) => e.code),
    ).toContain(TIER_VALIDATION.EMPTY_BAND);
    expect(
      validateTiers([{ fromUnit: 0, toUnit: 10, ratePerUnit: '1' }]).map((e) => e.code),
    ).toEqual([TIER_VALIDATION.LAST_NOT_OPEN_ENDED]);
    expect(
      validateTiers([{ fromUnit: 0, toUnit: null, ratePerUnit: '-1' }]).map((e) => e.code),
    ).toEqual([TIER_VALIDATION.NEGATIVE_RATE]);
    expect(validateTiers([]).map((e) => e.code)).toEqual([TIER_VALIDATION.NO_TIERS]);
  });
});

describe('computeTieredCharge', () => {
  it('charges nothing for zero consumption', () => {
    const result = computeTieredCharge(0, DOMESTIC);
    expect(result.lines).toEqual([]);
    expect(result.consumptionCharge.toFixed()).toBe('0');
  });

  it('fills bands in order at the boundaries 10, 30, 60', () => {
    expect(computeTieredCharge(10, DOMESTIC).lines.map((l) => l.units)).toEqual([10]);
    expect(computeTieredCharge(10, DOMESTIC).consumptionCharge.toFixed()).toBe('2857.5');
    expect(computeTieredCharge(30, DOMESTIC).lines.map((l) => l.units)).toEqual([10, 20]);
    expect(computeTieredCharge(60, DOMESTIC).lines.map((l) => l.units)).toEqual([10, 20, 30]);
    expect(computeTieredCharge(60, DOMESTIC).consumptionCharge.toFixed()).toBe('37147.5'); // 2857.5 + 10287 + 24003
  });

  it('puts everything above the last boundary in the open-ended band', () => {
    const result = computeTieredCharge(500, DOMESTIC);
    expect(result.lines.map((l) => l.units)).toEqual([10, 20, 30, 440]);
    expect(result.lines[3]?.to).toBeNull();
    expect(result.consumptionCharge.toFixed()).toBe('540067.5'); // 37147.5 + 440 × 1143
  });
});
