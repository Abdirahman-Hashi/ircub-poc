import { Decimal } from 'decimal.js';

import { roundMoney, toDecimal } from '../../../common/money/money.rules';
import { WATER } from '../water.constants';

import type { PeriodBounds, PreviousBillLedger } from '../water.types';

/** Arrears = what is still owed on earlier bills (D14); payments already reduce `paidAmount`. */
export function arrearsOf(previousBills: readonly PreviousBillLedger[]): Decimal {
  return roundMoney(
    previousBills.reduce((sum, bill) => {
      const outstanding = toDecimal(bill.totalDue).minus(toDecimal(bill.paidAmount));
      return outstanding.gt(0) ? sum.plus(outstanding) : sum;
    }, new Decimal(0)),
  );
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
