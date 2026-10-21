import { AssessmentStatus, BillStatus } from '@ircub/shared';

/** Only released bills take payments; drafts and flagged bills are still under review. */
export function isBillPayable(status: BillStatus): boolean {
  return status === BillStatus.RELEASED || status === BillStatus.PART_PAID;
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
