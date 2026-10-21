import { PaymentStatus, ReversalStatus } from '@ircub/shared';

import { isDecided, isReversible, violatesSegregation } from './reversals.rules';

describe('reversal rules', () => {
  it('flags the capturer deciding their own reversal and nobody else', () => {
    expect(violatesSegregation('u1', 'u1')).toBe(true);
    expect(violatesSegregation('u1', 'u2')).toBe(false);
  });

  it('only confirmed payments are reversible', () => {
    expect(isReversible(PaymentStatus.CONFIRMED)).toBe(true);
    expect(isReversible(PaymentStatus.REVERSED)).toBe(false);
    expect(isReversible(PaymentStatus.PENDING)).toBe(false);
  });

  it('a decided reversal cannot be decided again', () => {
    expect(isDecided(ReversalStatus.PENDING_APPROVAL)).toBe(false);
    expect(isDecided(ReversalStatus.APPROVED)).toBe(true);
    expect(isDecided(ReversalStatus.REJECTED)).toBe(true);
  });
});
