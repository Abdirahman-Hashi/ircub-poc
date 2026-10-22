import type {
  Currency,
  FmisJournalRequest,
  FmisJournalResponse,
  FmisLedgerEntry,
  FmisLedgerResponse,
  FmisReconciliationStatus,
  JournalBatchStatus,
} from '@ircub/shared';

import type { FMIS_API } from './fmis.constants';
import type { DecimalLike } from '../../common/money/money.types';
import type { Prisma } from '@prisma/client';

/** Contract with the FMIS (standards §3). The HTTP implementation talks to the mock. */
export interface FmisClient {
  postJournal(request: FmisJournalRequest, forceFailure?: boolean): Promise<FmisJournalResponse>;
  ledger(date: string): Promise<FmisLedgerResponse>;
}

export type FmisSortField = (typeof FMIS_API.SORTABLE)[number];

/** A dated mapping candidate for `resolveMapping`. */
export interface MappingCandidate {
  readonly glCode: string;
  readonly glName: string;
  readonly effectiveFrom: Date;
}

/** A confirmed payment with no journal line yet; `localAmount` is what gets posted. */
export interface EligiblePayment {
  readonly id: string;
  readonly controlNumber: string;
  readonly localAmount: DecimalLike;
  readonly revenueTypeId: string;
}

/** Input to create a journal line (collection or reversal) inside the batch transaction. */
export interface LineDraft {
  readonly paymentId: string | null;
  readonly reversalId: string | null;
  readonly revenueTypeId: string;
  readonly glCode: string;
  readonly debitGl: string;
  readonly creditGl: string;
  readonly amount: string;
  readonly currency: Currency;
  readonly reference: string;
}

/** What `toFmisPayload` needs from a stored line. */
export interface PostableLine {
  readonly debitGl: string;
  readonly creditGl: string;
  readonly amount: DecimalLike;
  readonly currency: Currency;
  readonly reference: string;
}

export interface PostingProgress {
  readonly attempts: number;
  readonly exhausted: boolean;
}

export interface LedgerTotals {
  readonly glCode: string;
  readonly netCredit: string;
}

export interface ReconciliationVerdict {
  readonly difference: string;
  readonly status: FmisReconciliationStatus;
}

export interface CachedLedger {
  readonly entries: readonly FmisLedgerEntry[];
  readonly expiresAt: number;
}

export type GlMappingWithType = Prisma.GlMappingGetPayload<{
  include: { revenueType: { select: { code: true; name: true } } };
}>;

export type JournalBatchRow = Prisma.JournalBatchGetPayload<object>;

export type JournalLineWithRelations = Prisma.JournalLineGetPayload<{
  include: {
    revenueType: { select: { code: true; name: true } };
    payment: {
      select: {
        id: true;
        controlNumber: true;
        channel: true;
        paidAt: true;
        payer: { select: { id: true; name: true; tin: true } };
      };
    };
    reversal: {
      select: {
        payment: {
          select: {
            id: true;
            controlNumber: true;
            channel: true;
            paidAt: true;
            payer: { select: { id: true; name: true; tin: true } };
          };
        };
      };
    };
  };
}>;

export type JournalBatchWithLines = JournalBatchRow & {
  readonly lines: JournalLineWithRelations[];
};

export interface PaymentJournalLink {
  readonly id: string;
  readonly reversed: boolean;
  readonly batch: {
    readonly id: string;
    readonly batchDate: Date;
    readonly status: JournalBatchStatus;
    readonly fmisReference: string | null;
  };
}
