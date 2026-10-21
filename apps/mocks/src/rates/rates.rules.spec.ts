import { Currency } from '@ircub/shared';

import { driftRates, rebase } from './rates.rules';

const BASE_RATES = { [Currency.USD]: 1, [Currency.SOS]: 571.5 } as const;

describe('driftRates', () => {
  it('keeps the base currency at exactly 1', () => {
    const result = driftRates(Currency.USD, BASE_RATES, 0.5, () => 0.9);
    expect(result.USD).toBe(1);
  });

  it('moves other rates by at most the configured percentage', () => {
    const up = driftRates(Currency.USD, BASE_RATES, 0.5, () => 1);
    const down = driftRates(Currency.USD, BASE_RATES, 0.5, () => 0);
    expect(up.SOS).toBeCloseTo(571.5 * 1.005, 4);
    expect(down.SOS).toBeCloseTo(571.5 * 0.995, 4);
  });

  it('leaves rates unchanged when the random source is centred', () => {
    const result = driftRates(Currency.USD, BASE_RATES, 0.5, () => 0.5);
    expect(result.SOS).toBe(571.5);
  });
});

describe('rebase', () => {
  it('expresses the table in the requested base currency', () => {
    const result = rebase(BASE_RATES, Currency.SOS);
    expect(result.SOS).toBe(1);
    expect(result.USD).toBeCloseTo(1 / 571.5, 6);
  });
});
