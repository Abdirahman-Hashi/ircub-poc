import { Decimal } from 'decimal.js';

import { roundMoney, toDecimal } from '../../../common/money/money.rules';

import type {
  StatementBillInput,
  StatementComputation,
  StatementComputedLine,
  StatementPaymentInput,
} from '../water.types';

/**
 * Account statement: bills are debits (on release), payments credits (on paid date); the
 * opening balance is everything before `from`, then each line carries a running balance.
 */
export function buildStatement(
  bills: readonly StatementBillInput[],
  payments: readonly StatementPaymentInput[],
  from: Date,
  to: Date,
): StatementComputation {
  const events: Omit<StatementComputedLine, 'balance'>[] = [
    ...bills.map((bill) => ({
      date: bill.releasedAt,
      kind: 'BILL' as const,
      reference: bill.billNumber,
      description: `Water bill ${bill.period}`,
      debit: roundMoney(bill.totalDue),
      credit: new Decimal(0),
    })),
    ...payments.map((payment) => ({
      date: payment.paidAt,
      kind: 'PAYMENT' as const,
      reference: payment.reference,
      description: 'Payment',
      debit: new Decimal(0),
      credit: roundMoney(payment.localAmount),
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime() || a.kind.localeCompare(b.kind));

  let balance = new Decimal(0);
  for (const event of events) {
    if (event.date.getTime() < from.getTime()) {
      balance = balance.plus(event.debit).minus(event.credit);
    }
  }
  const openingBalance = roundMoney(balance);
  const lines: StatementComputedLine[] = [
    {
      date: from,
      kind: 'OPENING',
      reference: '',
      description: 'Opening balance',
      debit: new Decimal(0),
      credit: new Decimal(0),
      balance: openingBalance,
    },
  ];
  for (const event of events) {
    if (event.date.getTime() < from.getTime() || event.date.getTime() > to.getTime()) {
      continue;
    }
    balance = roundMoney(balance.plus(event.debit).minus(event.credit));
    lines.push({ ...event, balance });
  }
  return { openingBalance, closingBalance: roundMoney(balance), lines };
}

export function toDecimalOrZero(value: unknown): Decimal {
  return value === null || value === undefined ? new Decimal(0) : toDecimal(value);
}
