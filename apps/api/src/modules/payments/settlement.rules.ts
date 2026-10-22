import { ChannelOutcome, PaymentStatus } from '@ircub/shared';

import { toDecimal } from '../../common/money/money.rules';

import type {
  PaymentLedgerSnapshot,
  SettlementDecision,
  SettlementOutcome,
  StatusCheckProgress,
} from './payments.types';

/** Money has been applied to the ledger (or applied and reversed): nothing can change it. */
const SETTLED: readonly PaymentStatus[] = [PaymentStatus.CONFIRMED, PaymentStatus.REVERSED];

export function isSettled(status: PaymentStatus): boolean {
  return SETTLED.includes(status);
}

/**
 * What a callback or status check means for a payment (D15):
 * - CONFIRMED or REVERSED → DUPLICATE (idempotent, nothing changes)
 * - channel says FAILED → FAIL while PENDING; a repeat FAILED on an already failed payment is a DUPLICATE
 * - amount or currency differ from what we initiated → MISMATCH (recorded as FAILED with a reason)
 * - otherwise → CONFIRM, also for a FAILED or PERMANENTLY_FAILED payment: a late SUCCESS means
 *   the channel did take the money, so it is applied rather than ignored.
 */
export function decideSettlement(
  payment: PaymentLedgerSnapshot,
  outcome: SettlementOutcome,
): SettlementDecision {
  if (isSettled(payment.status)) {
    return 'DUPLICATE';
  }
  if (outcome.status === ChannelOutcome.FAILED) {
    return payment.status === PaymentStatus.PENDING ? 'FAIL' : 'DUPLICATE';
  }
  if (
    outcome.currency !== payment.currency ||
    !toDecimal(outcome.amount).eq(toDecimal(payment.amount))
  ) {
    return 'MISMATCH';
  }
  return 'CONFIRM';
}

/** One more status check: the counter grows until it reaches the configured limit. */
export function nextStatusCheck(attempts: number, limit: number): StatusCheckProgress {
  const next = attempts + 1;
  return { attempts: next, exhausted: next >= limit };
}
