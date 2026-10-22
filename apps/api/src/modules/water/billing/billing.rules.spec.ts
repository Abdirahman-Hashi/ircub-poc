import { Decimal } from 'decimal.js';

import {
  accountOutstanding,
  arrearsOf,
  isValidPeriod,
  periodBounds,
  periodOf,
  previousPeriod,
  totalDueOf,
} from './billing.rules';

describe('arrears carry-forward', () => {
  const bill = (consumptionCharge: string, paidAmount: string, fixedCharge = '0') => ({
    consumptionCharge,
    fixedCharge,
    paidAmount,
  });

  it('is the net of charges and payments across earlier bills, floored at zero', () => {
    expect(arrearsOf([bill('1000', '400'), bill('500', '500')]).toFixed()).toBe('600');
    expect(arrearsOf([bill('200', '250')]).toFixed()).toBe('0'); // overpaid → nothing owed
    expect(arrearsOf([]).toFixed()).toBe('0');
  });

  it('carries the same debt forward exactly once across three cycles', () => {
    // Cycle 1: 3000 + 500 billed, 1000 paid → 2500 owed.
    const cycle1 = bill('3000', '1000', '500');
    const cycle2Arrears = arrearsOf([cycle1]);
    expect(cycle2Arrears.toFixed()).toBe('2500');
    // Cycle 2: 2000 + 500 of new charges on top of the 2500 → total due 5000, nothing paid.
    const cycle2Total = totalDueOf(new Decimal('2000'), new Decimal('500'), cycle2Arrears);
    expect(cycle2Total.toFixed()).toBe('5000');
    const cycle2 = bill('2000', '0', '500');
    // Cycle 3 owes 5000: cycle 1's remainder must not be counted again through cycle 2's total.
    expect(arrearsOf([cycle1, cycle2]).toFixed()).toBe('5000');
  });

  it('treats a payment against the latest bill as settling the older arrears it rolled up', () => {
    const cycle1 = bill('3000', '1000', '500'); // 2500 carried
    const cycle2 = bill('2000', '5000', '500'); // paid in full, including cycle 1's 2500
    expect(accountOutstanding([cycle1, cycle2]).toFixed()).toBe('0');
    expect(arrearsOf([cycle1, cycle2]).toFixed()).toBe('0');
  });
});

describe('periods', () => {
  it('validates YYYY-MM', () => {
    expect(isValidPeriod('2026-03')).toBe(true);
    expect(isValidPeriod('2026-13')).toBe(false);
    expect(isValidPeriod('2026-3')).toBe(false);
  });

  it('computes month bounds in UTC and the previous period', () => {
    const bounds = periodBounds('2026-02');
    expect(bounds.start.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(bounds.end.toISOString()).toBe('2026-02-28T00:00:00.000Z');
    expect(periodOf(new Date('2026-12-31T23:00:00Z'))).toBe('2026-12');
    expect(previousPeriod('2026-01')).toBe('2025-12');
  });
});
