import { describe, expect, it } from 'vitest';

import { PaymentStatus } from '@ircub/shared';

import { describeStatusChange, previewLocalAmount, roundHalfEven } from './payments.rules';

describe('roundHalfEven', () => {
  it('rounds ties to the even neighbour and everything else normally', () => {
    expect(roundHalfEven(2.345, 2)).toBe(2.34);
    expect(roundHalfEven(2.355, 2)).toBe(2.36);
    expect(roundHalfEven(2.346, 2)).toBe(2.35);
  });
});

describe('previewLocalAmount', () => {
  it('returns the amount itself for the local currency', () => {
    expect(previewLocalAmount('100', 'SOS', 'SOS', null)).toBe('100.00');
  });

  it('converts foreign amounts with the given rate and refuses bad input', () => {
    expect(previewLocalAmount('10', 'USD', 'SOS', '571.5')).toBe('5715.00');
    expect(previewLocalAmount('10', 'USD', 'SOS', null)).toBeNull();
    expect(previewLocalAmount('abc', 'USD', 'SOS', '571.5')).toBeNull();
    expect(previewLocalAmount('0', 'SOS', 'SOS', null)).toBeNull();
  });
});

describe('describeStatusChange', () => {
  const base = { paymentId: 'p', payerId: 'x', controlNumber: '000000000195', localAmount: '1' };

  it('is silent while the payment is still in flight', () => {
    expect(
      describeStatusChange({ ...base, status: PaymentStatus.PENDING, failureReason: null }),
    ).toBeNull();
  });

  it('describes confirmations and failures with their reason', () => {
    expect(
      describeStatusChange({ ...base, status: PaymentStatus.CONFIRMED, failureReason: null }),
    ).toEqual({
      color: 'teal',
      message: 'Payment for 000000000195 is CONFIRMED',
    });
    expect(
      describeStatusChange({
        ...base,
        status: PaymentStatus.PERMANENTLY_FAILED,
        failureReason: 'no answer',
      })?.message,
    ).toBe('Payment for 000000000195 is PERMANENTLY FAILED: no answer');
  });
});
