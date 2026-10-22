import { Decimal } from 'decimal.js';

import { FMIS } from '@ircub/shared';
import type { FmisJournalLine, FmisLedgerEntry } from '@ircub/shared';

import { FMIS_MOCK } from '../mocks.constants';

import type { StoredJournal } from '../store/store.types';

/** Double-entry check: total debits must equal total credits. */
export function isBalanced(lines: readonly FmisJournalLine[]): boolean {
  const debit = lines.reduce((sum, line) => sum.plus(line.debit), new Decimal(0));
  const credit = lines.reduce((sum, line) => sum.plus(line.credit), new Decimal(0));
  return debit.eq(credit);
}

/** Failure triggers for the retry demo: `?fail=1` or a batch date ending in `13`. */
export function shouldFail(date: string, failFlag: string | undefined): boolean {
  return failFlag === FMIS.FAIL_ON || date.endsWith(FMIS.FAIL_DAY_SUFFIX);
}

/** Deterministic per batch so a repeated post returns the same reference (D11). */
export function referenceFor(batchId: string): string {
  return `${FMIS.REFERENCE_PREFIX}${batchId.replace(/-/g, '').slice(0, FMIS_MOCK.REFERENCE_ID_LENGTH).toUpperCase()}`;
}

/** Ledger totals per GL code for a day, from every journal posted with that date. */
export function ledgerFor(journals: Iterable<StoredJournal>, date: string): FmisLedgerEntry[] {
  const totals = new Map<string, { debit: Decimal; credit: Decimal }>();
  for (const journal of journals) {
    if (journal.date !== date) {
      continue;
    }
    for (const line of journal.lines) {
      const entry = totals.get(line.glCode) ?? { debit: new Decimal(0), credit: new Decimal(0) };
      totals.set(line.glCode, {
        debit: entry.debit.plus(line.debit),
        credit: entry.credit.plus(line.credit),
      });
    }
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([glCode, entry]) => ({
      glCode,
      debit: entry.debit.toFixed(FMIS_MOCK.AMOUNT_DECIMALS),
      credit: entry.credit.toFixed(FMIS_MOCK.AMOUNT_DECIMALS),
    }));
}
