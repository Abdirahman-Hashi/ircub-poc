import type { Currency } from '@ircub/shared';

/** One simulated channel payment (bank or mobile money). Fleshed out in phase 4. */
export interface StoredPayment {
  readonly txnRef: string;
  readonly amount: string;
  readonly currency: Currency;
  readonly controlNumber: string;
  readonly callbackUrl: string;
  status: string;
  readonly createdAt: string;
  paidAt?: string;
}

/** One posted FMIS journal batch (phase 5). */
export interface StoredJournal {
  readonly batchId: string;
  readonly fmisReference: string;
  readonly date: string;
  readonly postedAt: string;
  readonly lines: readonly StoredJournalLine[];
}

export interface StoredJournalLine {
  readonly glCode: string;
  readonly debit: string;
  readonly credit: string;
  readonly currency: Currency;
  readonly reference: string;
}

/** One "sent" SMS or email, visible on GET /outbox (phase 4/5). */
export interface StoredMessage {
  readonly channel: string;
  readonly to: string;
  readonly subject?: string;
  readonly body: string;
  readonly sentAt: string;
}

/** Outcome forced for a txnRef via POST /__scenario (phase 4). */
export interface ForcedScenario {
  readonly txnRef: string;
  readonly outcome: string;
}

export interface StoreSnapshot {
  readonly payments: number;
  readonly journals: number;
  readonly outbox: number;
  readonly scenarios: number;
}
