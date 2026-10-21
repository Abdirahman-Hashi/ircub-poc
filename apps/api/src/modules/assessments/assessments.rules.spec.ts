import { Decimal } from 'decimal.js';

import { AssessmentStatus, RateType } from '@ircub/shared';

import {
  applyPayment,
  computeAssessmentAmount,
  isPayable,
  outstandingOf,
  reversePayment,
  statusFor,
} from './assessments.rules';

const ledger = (
  amount: string,
  paid: string,
  status: AssessmentStatus = AssessmentStatus.PENDING,
) => ({
  amount: new Decimal(amount),
  paidAmount: new Decimal(paid),
  status,
});

describe('computeAssessmentAmount', () => {
  it('uses the rate itself for FIXED types', () => {
    expect(computeAssessmentAmount(RateType.FIXED, '150000', null)?.toFixed()).toBe('150000');
  });

  it('computes rate % of the base for PERCENT types and needs a base', () => {
    expect(computeAssessmentAmount(RateType.PERCENT, '0.5', '2000000')?.toFixed()).toBe('10000');
    expect(computeAssessmentAmount(RateType.PERCENT, '0.5', null)).toBeNull();
  });
});

describe('applyPayment', () => {
  it('moves PENDING → PART_PAID → PAID', () => {
    const part = applyPayment(ledger('1000', '0'), '400');
    expect(part).toEqual({
      ok: true,
      paidAmount: new Decimal('400'),
      status: AssessmentStatus.PART_PAID,
    });
    const paid = applyPayment(ledger('1000', '400', AssessmentStatus.PART_PAID), '600');
    expect(paid).toEqual({
      ok: true,
      paidAmount: new Decimal('1000'),
      status: AssessmentStatus.PAID,
    });
  });

  it('rejects an over-payment with the outstanding amount', () => {
    expect(applyPayment(ledger('1000', '900'), '100.01')).toEqual({
      ok: false,
      outstanding: new Decimal('100'),
    });
  });

  it('keeps CANCELLED sticky and reports payability', () => {
    expect(statusFor('100', '100', AssessmentStatus.CANCELLED)).toBe(AssessmentStatus.CANCELLED);
    expect(isPayable(AssessmentStatus.PART_PAID)).toBe(true);
    expect(isPayable(AssessmentStatus.PAID)).toBe(false);
    expect(isPayable(AssessmentStatus.CANCELLED)).toBe(false);
  });
});

describe('reversePayment / outstandingOf', () => {
  it('reduces paid amount and recomputes status', () => {
    expect(reversePayment(ledger('1000', '1000', AssessmentStatus.PAID), '600')).toEqual({
      paidAmount: new Decimal('400'),
      status: AssessmentStatus.PART_PAID,
    });
    expect(reversePayment(ledger('1000', '400', AssessmentStatus.PART_PAID), '400').status).toBe(
      AssessmentStatus.PENDING,
    );
  });

  it('never goes negative', () => {
    expect(outstandingOf('100', '150').toFixed()).toBe('0');
    expect(reversePayment(ledger('100', '50'), '80').paidAmount.toFixed()).toBe('0');
  });
});
