import { Decimal } from 'decimal.js';

import { convertToLocal, isPositive, percentOf, roundMoney, toDecimal } from './money.rules';

describe('money rules', () => {
  it('rounds half-even to 2 dp', () => {
    expect(roundMoney('2.345').toString()).toBe('2.34');
    expect(roundMoney('2.355').toString()).toBe('2.36');
    expect(roundMoney(new Decimal('1.005')).toString()).toBe('1');
  });

  it('converts a foreign amount with the rate rounded to 6 dp and the result once at the end', () => {
    const { localAmount, fxRate } = convertToLocal('100', '571.4999994');
    expect(fxRate.toString()).toBe('571.499999');
    expect(localAmount.toString()).toBe('57150');
    expect(convertToLocal('12.34').localAmount.toString()).toBe('12.34');
  });

  it('computes percentages without intermediate rounding', () => {
    expect(percentOf('1234.56', '0.5').toString()).toBe('6.17');
    expect(percentOf('200000', '12.5').toString()).toBe('25000');
  });

  it('accepts Prisma-style decimals via toString', () => {
    expect(toDecimal({ toString: () => '9.99' }).toString()).toBe('9.99');
    expect(isPositive('0.01')).toBe(true);
    expect(isPositive('0')).toBe(false);
  });
});
