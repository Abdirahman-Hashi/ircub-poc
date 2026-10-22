import { AssessmentStatus, BillStatus } from '@ircub/shared';

import type { BillLedgerPosition } from '../water.types';

/** Only released bills take payments; drafts and flagged bills are still under review. */
export function isBillPayable(status: BillStatus): boolean {
  return status === BillStatus.RELEASED || status === BillStatus.PART_PAID;
}

/** Released bills (paid or not) are the ones that count towards an account's ledger. */
export function isReleasedBill(status: BillStatus): boolean {
  return isBillPayable(status) || status === BillStatus.PAID;
}

/**
 * A released bill is superseded once a later bill of the same account has been released,
 * because that later bill carries this one's outstanding balance as arrears; accepting a
 * payment on both would collect the same debt twice. Returns the superseding bill, if any.
 */
export function supersedingBill<T extends BillLedgerPosition>(
  bill: BillLedgerPosition,
  accountBills: readonly T[],
): T | null {
  return (
    accountBills.find(
      (other) =>
        isReleasedBill(other.status) && other.periodStart.getTime() > bill.periodStart.getTime(),
    ) ?? null
  );
}

/** The ledger rule speaks assessment statuses; map them onto the bill lifecycle. */
export function toBillStatus(ledgerStatus: AssessmentStatus): BillStatus {
  switch (ledgerStatus) {
    case AssessmentStatus.PAID:
      return BillStatus.PAID;
    case AssessmentStatus.PART_PAID:
      return BillStatus.PART_PAID;
    default:
      return BillStatus.RELEASED;
  }
}
