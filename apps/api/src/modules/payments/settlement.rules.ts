import { PaymentStatus } from '@ircub/shared';

import { toDecimal } from '../../common/money/money.rules';

import type {
  PaymentLedgerSnapshot,
  SettlementDecision,
  SettlementOutcome,
  StatusCheckProgress,
} from './payments.types';

const TERMINAL: readonly PaymentStatus[] = [
  PaymentStatus.CONFIRMED,
  PaymentStatus.FAILED,
  PaymentStatus.PERMANENTLY_FAILED,
  PaymentStatus.REVERSED,
];

export function isTerminal(status: PaymentStatus): boolean {
  return TERMINAL.includes(status);
}

/**
 * What a callback or status check means for a payment (D15):
 * - already terminal → DUPLICATE (idempotent, nothing changes)
 * - channel says FAILED → FAIL
 * - amount or currency differ from what we initiated → MISMATCH (recorded as FAILED with a reason)
 * - otherwise → CONFIRM
 */
export function decideSettlement(
  payment: PaymentLedgerSnapshot,
  outcome: SettlementOutcome,
): SettlementDecision {
  if (isTerminal(payment.status)) {
    return 'DUPLICATE';
  }
  if (outcome.status === 'FAILED') {
    return 'FAIL';
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
