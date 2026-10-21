import { PaymentStatus, ReversalStatus } from '@ircub/shared';

/**
 * D7 hard rule: whoever captured a reversal may not decide it — regardless of which
 * permissions they hold through roles. Pure so the test cannot be bypassed by DI.
 */
export function violatesSegregation(capturedById: string, deciderId: string): boolean {
  return capturedById === deciderId;
}

export function isReversible(status: PaymentStatus): boolean {
  return status === PaymentStatus.CONFIRMED;
}

export function isDecided(status: ReversalStatus): boolean {
  return status !== ReversalStatus.PENDING_APPROVAL;
}
