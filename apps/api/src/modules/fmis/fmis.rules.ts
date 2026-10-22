import { FmisReconciliationStatus, JournalBatchStatus } from '@ircub/shared';
import type { Currency, FmisJournalLine, FmisLedgerEntry } from '@ircub/shared';

import { AMOUNT_SCALE } from '../../common/money/money.constants';
import { toDecimal } from '../../common/money/money.rules';
import { PRISMA_ERROR } from '../../prisma/prisma.constants';

import { FMIS_API } from './fmis.constants';

import type {
  EligiblePayment,
  LineDraft,
  MappingCandidate,
  PostableLine,
  PostingProgress,
  ReconciliationVerdict,
} from './fmis.types';

/** Prisma's code for a unique-constraint violation. */
export const PRISMA_UNIQUE_VIOLATION = PRISMA_ERROR.UNIQUE_VIOLATION;

/** Latest mapping whose `effectiveFrom` is on or before the date; null when none applies yet. */
export function resolveMapping<T extends MappingCandidate>(
  candidates: readonly T[],
  onDate: Date,
): T | null {
  let best: T | null = null;
  for (const candidate of candidates) {
    if (candidate.effectiveFrom.getTime() > onDate.getTime()) {
      continue;
    }
    if (best === null || candidate.effectiveFrom.getTime() > best.effectiveFrom.getTime()) {
      best = candidate;
    }
  }
  return best;
}

/**
 * Collection line: debit the cash control GL, credit the revenue GL (D17). The amount is the
 * payment's local amount, so the line is always denominated in the local currency even when
 * the payer paid in USD.
 */
export function collectionLine(
  payment: EligiblePayment,
  glCode: string,
  cashGl: string,
  localCurrency: Currency,
): LineDraft {
  return {
    paymentId: payment.id,
    reversalId: null,
    revenueTypeId: payment.revenueTypeId,
    glCode,
    debitGl: cashGl,
    creditGl: glCode,
    amount: toDecimal(payment.localAmount).toFixed(AMOUNT_SCALE),
    currency: localCurrency,
    reference: payment.controlNumber,
  };
}

/** First day (inclusive) a batch for `date` sweeps: `catchUpDays` before it, or the day itself. */
export function eligibilityWindowStart(date: string, catchUpDays: number): Date {
  const start = new Date(`${date}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() - Math.max(0, catchUpDays));
  return start;
}

/** Reversal line mirrors the original by swapping debit and credit (never a negative amount). */
export function reversalLine(original: LineDraft, reversalId: string): LineDraft {
  return {
    ...original,
    paymentId: null,
    reversalId,
    debitGl: original.creditGl,
    creditGl: original.debitGl,
  };
}

/** Each stored line becomes a debit entry and a credit entry, so the journal always balances. */
export function toFmisPayload(lines: readonly PostableLine[]): FmisJournalLine[] {
  return lines.flatMap((line) => {
    const amount = toDecimal(line.amount).toFixed(FMIS_API.AMOUNT_DECIMALS);
    return [
      {
        glCode: line.debitGl,
        debit: amount,
        credit: FMIS_API.ZERO,
        currency: line.currency,
        reference: line.reference,
      },
      {
        glCode: line.creditGl,
        debit: FMIS_API.ZERO,
        credit: amount,
        currency: line.currency,
        reference: line.reference,
      },
    ];
  });
}

export function sumAmounts(lines: readonly { readonly amount: PostableLine['amount'] }[]): string {
  return lines
    .reduce((total, line) => total.plus(toDecimal(line.amount)), toDecimal(0))
    .toFixed(AMOUNT_SCALE);
}

/** One more posting attempt; FAILED once the configured limit is reached. */
export function nextPostingAttempt(attempts: number, limit: number): PostingProgress {
  const next = attempts + 1;
  return { attempts: next, exhausted: next >= limit };
}

/** The original batch is REVERSED only when every one of its lines has been reversed. */
export function statusAfterReversal(reversedFlags: readonly boolean[]): JournalBatchStatus {
  return reversedFlags.length > 0 && reversedFlags.every(Boolean)
    ? JournalBatchStatus.REVERSED
    : JournalBatchStatus.POSTED;
}

/** Net credit per GL on the IRCUB side: credits minus debits of posted lines. */
export function netCreditByGl(lines: readonly PostableLine[]): Map<string, string> {
  const totals = new Map<string, ReturnType<typeof toDecimal>>();
  for (const line of lines) {
    const amount = toDecimal(line.amount);
    totals.set(line.creditGl, (totals.get(line.creditGl) ?? toDecimal(0)).plus(amount));
    totals.set(line.debitGl, (totals.get(line.debitGl) ?? toDecimal(0)).minus(amount));
  }
  return new Map([...totals.entries()].map(([gl, total]) => [gl, total.toFixed(AMOUNT_SCALE)]));
}

/** Net credit per GL on the FMIS side, from its ledger entries. */
export function netCreditFromLedger(entries: readonly FmisLedgerEntry[]): Map<string, string> {
  return new Map(
    entries.map((entry) => [
      entry.glCode,
      toDecimal(entry.credit).minus(toDecimal(entry.debit)).toFixed(AMOUNT_SCALE),
    ]),
  );
}

/** MATCHED when equal, MISSING_IN_FMIS when the FMIS has nothing for the GL, else MISMATCH. */
export function reconcile(
  ircubTotal: string,
  fmisTotal: string | undefined,
): ReconciliationVerdict {
  if (fmisTotal === undefined) {
    return { difference: ircubTotal, status: FmisReconciliationStatus.MISSING_IN_FMIS };
  }
  const difference = toDecimal(ircubTotal).minus(toDecimal(fmisTotal));
  return {
    difference: difference.toFixed(AMOUNT_SCALE),
    status: difference.isZero()
      ? FmisReconciliationStatus.MATCHED
      : FmisReconciliationStatus.MISMATCH,
  };
}

/** `YYYY-MM-DD` (UTC) of a Date. */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 'YYYY-MM-DD'.length);
}

/** Every UTC day from `from` to `to` inclusive. */
export function daysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  while (cursor.getTime() <= end.getTime()) {
    days.push(toDateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}
