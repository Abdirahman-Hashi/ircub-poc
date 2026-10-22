import { AssessmentStatus, BillStatus } from '@ircub/shared';

import { isBillPayable, supersedingBill, toBillStatus } from './bills.rules';

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

describe('supersedingBill', () => {
  const bill = (periodStart: string, status: BillStatus, billNumber: string) => ({
    periodStart: new Date(periodStart),
    status,
    billNumber,
  });
  const july = bill('2026-07-01', BillStatus.RELEASED, 'B7');

  it('names the later released bill that carries this one as arrears', () => {
    const august = bill('2026-08-01', BillStatus.PART_PAID, 'B8');
    expect(supersedingBill(july, [july, august])?.billNumber).toBe('B8');
    expect(
      supersedingBill(july, [july, bill('2026-08-01', BillStatus.PAID, 'B8p')])?.billNumber,
    ).toBe('B8p');
  });

  it('ignores drafts, flagged bills and earlier bills', () => {
    expect(
      supersedingBill(july, [
        july,
        bill('2026-08-01', BillStatus.DRAFT, 'D'),
        bill('2026-08-01', BillStatus.FLAGGED, 'F'),
        bill('2026-06-01', BillStatus.RELEASED, 'B6'),
      ]),
    ).toBeNull();
  });
});
