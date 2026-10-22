import { AssessmentStatus, BillStatus } from '@ircub/shared';

import { MONEY_DECIMALS } from '../payments/payments.constants';

import type { PayerProfile } from '../../api/types';
import type { PayTarget } from '../payments/payments.types';

const PAYABLE_ASSESSMENTS: readonly AssessmentStatus[] = [
  AssessmentStatus.PENDING,
  AssessmentStatus.PART_PAID,
];
const PAYABLE_BILLS: readonly BillStatus[] = [BillStatus.RELEASED, BillStatus.PART_PAID];
const RELEASED_BILLS: readonly BillStatus[] = [...PAYABLE_BILLS, BillStatus.PAID];

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
  // Only the latest released bill of an account is payable: it carries the earlier bills'
  // balance as arrears, so older bills are superseded (the API refuses them too).
  const bills = profile.waterAccounts.flatMap((summary) => {
    const latest = [...summary.bills]
      .sort((a, b) => String(b.periodStart).localeCompare(String(a.periodStart)))
      .find((b) => RELEASED_BILLS.includes(b.status));
    return latest === undefined || !PAYABLE_BILLS.includes(latest.status)
      ? []
      : [
          {
            controlNumber: latest.billNumber,
            description: `Water bill ${latest.period} · ${summary.account.accountNumber}`,
            outstanding: outstanding(latest.totalDue, latest.paidAmount),
            currency: latest.currency,
          },
        ];
  });
  return [...assessments, ...bills];
}
