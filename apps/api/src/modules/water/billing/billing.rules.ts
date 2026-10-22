import { Decimal } from 'decimal.js';

import { roundMoney, toDecimal } from '../../../common/money/money.rules';
import { WATER } from '../water.constants';

import type { AccountLedgerBill, PeriodBounds } from '../water.types';

/** A bill's own charges: consumption plus the fixed service charge, never its arrears. */
export function chargesOf(bill: AccountLedgerBill): Decimal {
  return toDecimal(bill.consumptionCharge).plus(toDecimal(bill.fixedCharge));
}

/**
 * What an account still owes = Σ own charges − Σ payments across its released bills, floored
 * at zero. Every bill's `totalDue` already includes the arrears of the bills before it, so
 * summing `totalDue − paidAmount` per bill would charge the same debt once per cycle.
 */
export function accountOutstanding(bills: readonly AccountLedgerBill[]): Decimal {
  const net = bills.reduce(
    (sum, bill) => sum.plus(chargesOf(bill)).minus(toDecimal(bill.paidAmount)),
    new Decimal(0),
  );
  return roundMoney(net.gt(0) ? net : new Decimal(0));
}

/** Arrears carried into a new bill (D14) are the account's outstanding balance before it. */
export function arrearsOf(previousBills: readonly AccountLedgerBill[]): Decimal {
  return accountOutstanding(previousBills);
}

export function totalDueOf(
  consumptionCharge: Decimal,
  fixedCharge: Decimal,
  arrears: Decimal,
): Decimal {
  return roundMoney(consumptionCharge.plus(fixedCharge).plus(arrears));
}

export function isValidPeriod(period: string): boolean {
  return WATER.PERIOD_PATTERN.test(period);
}

/** `2026-03` → 1 March 00:00 UTC to 31 March (inclusive date). */
export function periodBounds(period: string): PeriodBounds {
  const [yearText, monthText] = period.split(WATER.PERIOD_SEPARATOR);
  const year = Number(yearText);
  const month = Number(monthText);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { period, start, end };
}

export function periodOf(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(WATER.MONTH_DIGITS, '0');
  return `${date.getUTCFullYear()}${WATER.PERIOD_SEPARATOR}${month}`;
}

export function previousPeriod(period: string): string {
  const { start } = periodBounds(period);
  return periodOf(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, 1)));
}
