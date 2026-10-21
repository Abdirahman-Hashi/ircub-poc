import { describe, expect, it } from 'vitest';

import { tierErrors } from './tariffs.rules';

describe('tierErrors', () => {
  it('accepts a valid contiguous set', () => {
    expect(
      tierErrors([
        { fromUnit: 0, toUnit: 10, ratePerUnit: '1.00' },
        { fromUnit: 10, toUnit: null, ratePerUnit: '2' },
      ]),
    ).toEqual([]);
  });

  it('explains each problem', () => {
    const errors = tierErrors([
      { fromUnit: 5, toUnit: 4, ratePerUnit: 'x' },
      { fromUnit: 10, toUnit: 20, ratePerUnit: '1' },
    ]);
    expect(errors).toContain('First band must start at 0');
    expect(errors).toContain('Band 1: rate must be a decimal');
    expect(errors).toContain('Band 1: "to" must be greater than "from"');
    expect(errors).toContain('Bands 1 and 2 must be contiguous');
    expect(errors).toContain('Last band must be open-ended');
  });
});
