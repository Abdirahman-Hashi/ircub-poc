import { Decimal } from 'decimal.js';

import {
  arrearsOf,
  isValidPeriod,
  periodBounds,
  periodOf,
  previousPeriod,
  totalDueOf,
} from './billing.rules';

describe('arrears carry-forward', () => {
  it('sums the unpaid remainder of earlier bills and ignores overpaid ones', () => {
    const arrears = arrearsOf([
      { totalDue: '1000', paidAmount: '400' }, // 600 owed
      { totalDue: '500', paidAmount: '500' }, // settled
      { totalDue: '200', paidAmount: '250' }, // overpaid → 0
    ]);
    expect(arrears.toFixed()).toBe('600');
  });

  it('carries across two cycles: cycle 2 arrears include cycle 1 remainder, cycle 3 includes both', () => {
    const cycle1 = {
      totalDue: totalDueOf(new Decimal('3000'), new Decimal('500'), new Decimal(0)),
      paidAmount: '1000',
    };
    const cycle2Arrears = arrearsOf([cycle1]);
    expect(cycle2Arrears.toFixed()).toBe('2500');
    const cycle2 = {
      totalDue: totalDueOf(new Decimal('2000'), new Decimal('500'), cycle2Arrears),
      paidAmount: '0',
    };
    expect(cycle2.totalDue.toFixed()).toBe('5000');
    // Cycle 3 sees cycle 1's remainder again only through cycle 2 if cycle 1 is still unpaid;
    // the service passes every previous bill, so both are counted once each.
    expect(arrearsOf([cycle1, cycle2]).toFixed()).toBe('7500');
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
