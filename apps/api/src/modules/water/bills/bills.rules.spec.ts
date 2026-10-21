import { AssessmentStatus, BillStatus } from '@ircub/shared';

import { isBillPayable, toBillStatus } from './bills.rules';

describe('bill ledger rules', () => {
  it('only released or part-paid bills are payable', () => {
    expect(isBillPayable(BillStatus.RELEASED)).toBe(true);
    expect(isBillPayable(BillStatus.PART_PAID)).toBe(true);
    expect(isBillPayable(BillStatus.DRAFT)).toBe(false);
    expect(isBillPayable(BillStatus.FLAGGED)).toBe(false);
    expect(isBillPayable(BillStatus.PAID)).toBe(false);
  });

  it('maps ledger statuses onto the bill lifecycle', () => {
    expect(toBillStatus(AssessmentStatus.PAID)).toBe(BillStatus.PAID);
    expect(toBillStatus(AssessmentStatus.PART_PAID)).toBe(BillStatus.PART_PAID);
    expect(toBillStatus(AssessmentStatus.PENDING)).toBe(BillStatus.RELEASED);
  });
});
