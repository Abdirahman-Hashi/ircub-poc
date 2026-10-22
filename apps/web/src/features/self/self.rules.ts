import { AssessmentStatus, BillStatus } from '@ircub/shared';

import { MONEY_DECIMALS } from '../payments/payments.constants';

import type { PayerProfile } from '../../api/types';
import type { PayTarget } from '../payments/payments.types';

const PAYABLE_ASSESSMENTS: readonly AssessmentStatus[] = [
  AssessmentStatus.PENDING,
  AssessmentStatus.PART_PAID,
];
const PAYABLE_BILLS: readonly BillStatus[] = [BillStatus.RELEASED, BillStatus.PART_PAID];

function outstanding(amount: string, paid: string): string {
  return (Number(amount) - Number(paid)).toFixed(MONEY_DECIMALS);
}

/** Everything in a customer's profile that still has a balance to pay. */
export function payableTargets(profile: PayerProfile): PayTarget[] {
  const assessments = profile.assessments
    .filter((a) => PAYABLE_ASSESSMENTS.includes(a.status))
    .map((a) => ({
      controlNumber: a.controlNumber,
      description: `${a.revenueType.name}${a.period === null ? '' : ` ${a.period}`} · ${a.controlNumber}`,
      outstanding: outstanding(a.amount, a.paidAmount),
      currency: a.currency,
    }));
  const bills = profile.waterAccounts.flatMap((summary) =>
    summary.bills
      .filter((b) => PAYABLE_BILLS.includes(b.status))
      .map((b) => ({
        controlNumber: b.billNumber,
        description: `Water bill ${b.period} · ${summary.account.accountNumber}`,
        outstanding: outstanding(b.totalDue, b.paidAmount),
        currency: b.currency,
      })),
  );
  return [...assessments, ...bills];
}
