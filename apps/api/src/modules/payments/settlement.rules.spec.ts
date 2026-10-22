import { Currency, PaymentStatus } from '@ircub/shared';

import { decideSettlement, isTerminal, nextStatusCheck } from './settlement.rules';

const pending = { status: PaymentStatus.PENDING, amount: '100.00', currency: Currency.USD };

describe('decideSettlement', () => {
  it('confirms a matching SUCCESS', () => {
    expect(
      decideSettlement(pending, { status: 'SUCCESS', amount: '100', currency: Currency.USD }),
    ).toBe('CONFIRM');
  });

  it('treats any outcome for a terminal payment as a duplicate (idempotent callbacks)', () => {
    for (const status of [
      PaymentStatus.CONFIRMED,
      PaymentStatus.FAILED,
      PaymentStatus.PERMANENTLY_FAILED,
      PaymentStatus.REVERSED,
    ]) {
      expect(
        decideSettlement(
          { ...pending, status },
          { status: 'SUCCESS', amount: '100.00', currency: Currency.USD },
        ),
      ).toBe('DUPLICATE');
      expect(isTerminal(status)).toBe(true);
    }
    expect(isTerminal(PaymentStatus.PENDING)).toBe(false);
  });

  it('fails on FAILED, and flags an amount or currency mismatch', () => {
    expect(
      decideSettlement(pending, { status: 'FAILED', amount: '100.00', currency: Currency.USD }),
    ).toBe('FAIL');
    expect(
      decideSettlement(pending, { status: 'SUCCESS', amount: '100.01', currency: Currency.USD }),
    ).toBe('MISMATCH');
    expect(
      decideSettlement(pending, { status: 'SUCCESS', amount: '100.00', currency: Currency.SOS }),
    ).toBe('MISMATCH');
  });
});

describe('nextStatusCheck', () => {
  it('counts attempts and reports exhaustion at the configured limit', () => {
    expect(nextStatusCheck(0, 3)).toEqual({ attempts: 1, exhausted: false });
    expect(nextStatusCheck(1, 3)).toEqual({ attempts: 2, exhausted: false });
    expect(nextStatusCheck(2, 3)).toEqual({ attempts: 3, exhausted: true });
    expect(nextStatusCheck(0, 1)).toEqual({ attempts: 1, exhausted: true });
  });
});
