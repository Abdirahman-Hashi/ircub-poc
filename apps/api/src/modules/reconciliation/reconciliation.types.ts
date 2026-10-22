import type { Currency, ReconciliationLineStatus } from '@ircub/shared';

import type { RECONCILIATION_API } from './reconciliation.constants';
import type { DecimalLike } from '../../common/money/money.types';
import type { Prisma } from '@prisma/client';

/** IRCUB side of the match: a confirmed/reversed payment of the channel on the day. */
export interface LedgerEntry {
  readonly paymentId: string;
  readonly txnRef: string;
  readonly controlNumber: string;
  readonly amount: DecimalLike;
  readonly currency: Currency;
}

/** Channel side of the match: one parsed statement line. */
export interface StatementEntry {
  readonly statementLineId: string | null;
  readonly txnRef: string;
  readonly controlNumber: string;
  readonly amount: DecimalLike;
  readonly currency: Currency;
}

export interface ClassifiedLine {
  readonly status: ReconciliationLineStatus;
  readonly txnRef: string;
  readonly paymentId: string | null;
  readonly statementLineId: string | null;
  readonly ircubAmount: string | null;
  readonly channelAmount: string | null;
  readonly note: string | null;
}

export interface ReconciliationSummary {
  readonly matched: number;
  readonly missingInIrcub: number;
  readonly missingInChannel: number;
  readonly amountMismatch: number;
}

export interface ClassificationResult {
  readonly lines: readonly ClassifiedLine[];
  readonly summary: ReconciliationSummary;
}

export type ReconciliationRunWithStatement = Prisma.ReconciliationRunGetPayload<{
  include: { statement: { select: { fileName: true } } };
}>;

export type ReconciliationLineWithRelations = Prisma.ReconciliationLineGetPayload<{
  include: {
    payment: { select: { controlNumber: true; currency: true } };
    statementLine: { select: { controlNumber: true; currency: true } };
  };
}>;

export type ReconciliationSortField = (typeof RECONCILIATION_API.SORTABLE)[number];
