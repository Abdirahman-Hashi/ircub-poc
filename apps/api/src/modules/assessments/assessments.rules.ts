import { AssessmentStatus, RateType } from '@ircub/shared';

import { percentOf, roundMoney, toDecimal } from '../../common/money/money.rules';

import type { ApplyPaymentResult, AssessmentLedger } from './assessments.types';
import type { DecimalLike } from '../../common/money/money.types';
import type { Decimal } from 'decimal.js';

/** FIXED → the rate itself; PERCENT → rate % of the base amount (brief Module 3). */
export function computeAssessmentAmount(
  rateType: RateType,
  rate: DecimalLike,
  baseAmount: DecimalLike | null,
): Decimal | null {
  if (rateType === RateType.FIXED) {
    return roundMoney(rate);
  }
  if (baseAmount === null) {
    return null;
  }
  return percentOf(baseAmount, rate);
}

export function outstandingOf(amount: DecimalLike, paidAmount: DecimalLike): Decimal {
  const outstanding = toDecimal(amount).minus(toDecimal(paidAmount));
  return outstanding.lt(0) ? roundMoney(0) : roundMoney(outstanding);
}

/** Status implied by the ledger; CANCELLED is sticky. */
export function statusFor(
  amount: DecimalLike,
  paidAmount: DecimalLike,
  current: AssessmentStatus,
): AssessmentStatus {
  if (current === AssessmentStatus.CANCELLED) {
    return current;
  }
  const paid = toDecimal(paidAmount);
  if (paid.gte(toDecimal(amount))) {
    return AssessmentStatus.PAID;
  }
  return paid.gt(0) ? AssessmentStatus.PART_PAID : AssessmentStatus.PENDING;
}

export function isPayable(status: AssessmentStatus): boolean {
  return status === AssessmentStatus.PENDING || status === AssessmentStatus.PART_PAID;
}

/** Applies a local-currency payment; rejects anything above the outstanding balance. */
export function applyPayment(
  ledger: AssessmentLedger,
  localAmount: DecimalLike,
): ApplyPaymentResult {
  const outstanding = outstandingOf(ledger.amount, ledger.paidAmount);
  const payment = toDecimal(localAmount);
  if (payment.gt(outstanding)) {
    return { ok: false, outstanding };
  }
  const paidAmount = roundMoney(ledger.paidAmount.plus(payment));
  return { ok: true, paidAmount, status: statusFor(ledger.amount, paidAmount, ledger.status) };
}

/** Undoes a payment (reversal approval); never below zero. */
export function reversePayment(
  ledger: AssessmentLedger,
  localAmount: DecimalLike,
): { paidAmount: Decimal; status: AssessmentStatus } {
  const next = ledger.paidAmount.minus(toDecimal(localAmount));
  const paidAmount = roundMoney(next.lt(0) ? 0 : next);
  return { paidAmount, status: statusFor(ledger.amount, paidAmount, ledger.status) };
}
