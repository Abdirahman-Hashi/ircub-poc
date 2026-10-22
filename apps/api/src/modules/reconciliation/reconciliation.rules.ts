import { ReconciliationLineStatus } from '@ircub/shared';

import { AMOUNT_SCALE } from '../../common/money/money.constants';
import { roundMoney, toDecimal } from '../../common/money/money.rules';

import { RECONCILIATION_MESSAGES } from './reconciliation.messages';

import type {
  ClassificationResult,
  ClassifiedLine,
  LedgerEntry,
  ReconciliationSummary,
  StatementEntry,
} from './reconciliation.types';

/**
 * Two-way match on the channel transaction reference (D16). Amounts are compared in the
 * original currency because that is what the channel settled; the FX applied inside IRCUB
 * is not the channel's concern.
 */
export function classify(
  ledger: readonly LedgerEntry[],
  statement: readonly StatementEntry[],
): ClassificationResult {
  const byRef = new Map(statement.map((entry) => [entry.txnRef, entry]));
  const lines: ClassifiedLine[] = [];
  for (const entry of ledger) {
    const channel = byRef.get(entry.txnRef);
    if (channel === undefined) {
      lines.push(
        line(
          ReconciliationLineStatus.MISSING_IN_CHANNEL,
          entry,
          null,
          RECONCILIATION_MESSAGES.NOTE_MISSING_IN_CHANNEL,
        ),
      );
      continue;
    }
    byRef.delete(entry.txnRef);
    const sameAmount =
      toDecimal(entry.amount).eq(toDecimal(channel.amount)) && entry.currency === channel.currency;
    lines.push(
      sameAmount
        ? line(ReconciliationLineStatus.MATCHED, entry, channel, null)
        : line(
            ReconciliationLineStatus.AMOUNT_MISMATCH,
            entry,
            channel,
            RECONCILIATION_MESSAGES.NOTE_AMOUNT_MISMATCH,
          ),
    );
  }
  for (const channel of byRef.values()) {
    lines.push(
      line(
        ReconciliationLineStatus.MISSING_IN_IRCUB,
        null,
        channel,
        RECONCILIATION_MESSAGES.NOTE_MISSING_IN_IRCUB,
      ),
    );
  }
  return { lines, summary: summarise(lines) };
}

export function summarise(lines: readonly ClassifiedLine[]): ReconciliationSummary {
  const count = (status: ReconciliationLineStatus): number =>
    lines.filter((item) => item.status === status).length;
  return {
    matched: count(ReconciliationLineStatus.MATCHED),
    missingInIrcub: count(ReconciliationLineStatus.MISSING_IN_IRCUB),
    missingInChannel: count(ReconciliationLineStatus.MISSING_IN_CHANNEL),
    amountMismatch: count(ReconciliationLineStatus.AMOUNT_MISMATCH),
  };
}

/** Yesterday as `YYYY-MM-DD` in UTC, the business day the daily cron reconciles. */
export function previousUtcDay(now: Date): string {
  const copy = new Date(now);
  copy.setUTCDate(copy.getUTCDate() - 1);
  return copy.toISOString().slice(0, 'YYYY-MM-DD'.length);
}

/** `[start, end)` UTC bounds of a `YYYY-MM-DD` day. */
export function utcDayBounds(date: string): { readonly start: Date; readonly end: Date } {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function line(
  status: ReconciliationLineStatus,
  ledger: LedgerEntry | null,
  channel: StatementEntry | null,
  note: string | null,
): ClassifiedLine {
  return {
    status,
    txnRef: ledger?.txnRef ?? channel?.txnRef ?? '',
    paymentId: ledger?.paymentId ?? null,
    statementLineId: channel?.statementLineId ?? null,
    ircubAmount: ledger === null ? null : roundMoney(ledger.amount).toFixed(AMOUNT_SCALE),
    channelAmount: channel === null ? null : roundMoney(channel.amount).toFixed(AMOUNT_SCALE),
    note,
  };
}
