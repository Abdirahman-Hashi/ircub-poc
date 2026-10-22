import type {
  Currency,
  FmisReconciliationStatus,
  JournalBatchKind,
  JournalBatchStatus,
  PaymentChannel,
} from '../enums';
import type { MoneyString } from './registry.types';

/** One line of the journal payload sent to the FMIS; either debit or credit is non-zero. */
export interface FmisJournalLine {
  readonly glCode: string;
  readonly debit: MoneyString;
  readonly credit: MoneyString;
  readonly currency: Currency;
  readonly reference: string;
}

export interface FmisJournalRequest {
  readonly batchId: string;
  readonly date: string;
  readonly lines: readonly FmisJournalLine[];
}

export interface FmisJournalResponse {
  readonly fmisReference: string;
  readonly status: string;
}

export interface FmisLedgerEntry {
  readonly glCode: string;
  readonly debit: MoneyString;
  readonly credit: MoneyString;
}

export interface FmisLedgerResponse {
  readonly date: string;
  readonly entries: readonly FmisLedgerEntry[];
}

export interface GlMappingView {
  readonly id: string;
  readonly revenueTypeId: string;
  readonly revenueType: { readonly code: string; readonly name: string };
  readonly glCode: string;
  readonly glName: string;
  readonly effectiveFrom: Date | string;
  readonly createdAt: Date | string;
}

export interface JournalBatchView {
  readonly id: string;
  readonly batchDate: Date | string;
  readonly kind: JournalBatchKind;
  readonly status: JournalBatchStatus;
  readonly lineCount: number;
  readonly totalLocal: MoneyString;
  readonly fmisReference: string | null;
  readonly postedAt: Date | string | null;
  readonly attempts: number;
  readonly lastError: string | null;
  readonly reversedByBatchId: string | null;
  readonly createdAt: Date | string;
}

export interface JournalLinePayment {
  readonly id: string;
  readonly controlNumber: string;
  readonly channel: PaymentChannel;
  readonly paidAt: Date | string | null;
  readonly payer: { readonly id: string; readonly name: string; readonly tin: string };
}

export interface JournalLineView {
  readonly id: string;
  readonly batchId: string;
  readonly paymentId: string | null;
  readonly reversalId: string | null;
  readonly revenueType: { readonly code: string; readonly name: string };
  readonly glCode: string;
  readonly debitGl: string;
  readonly creditGl: string;
  readonly amount: MoneyString;
  readonly currency: Currency;
  readonly reference: string;
  readonly reversed: boolean;
  /** The payment behind the line (via the reversal for reversal lines). */
  readonly payment: JournalLinePayment | null;
}

export interface JournalBatchDetail extends JournalBatchView {
  readonly lines: readonly JournalLineView[];
}

/** What a payment detail shows about its posting (traceability). */
export interface PaymentJournalSummary {
  readonly lineId: string;
  readonly batchId: string;
  readonly batchDate: Date | string;
  readonly batchStatus: JournalBatchStatus;
  readonly fmisReference: string | null;
  readonly reversed: boolean;
}

export interface FmisReconciliationRow {
  readonly date: string;
  readonly glCode: string;
  readonly glName: string | null;
  readonly ircubTotal: MoneyString;
  readonly fmisTotal: MoneyString;
  readonly difference: MoneyString;
  readonly status: FmisReconciliationStatus;
}

export interface FmisReconciliationDrilldown {
  readonly date: string;
  readonly glCode: string;
  readonly lines: readonly JournalLineView[];
}
