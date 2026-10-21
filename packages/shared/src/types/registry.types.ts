import type { PayerWaterSummary } from './water.types';
import type {
  AssessmentStatus,
  BillStatus,
  BulkUploadKind,
  Currency,
  DuplicateFlagStatus,
  DuplicateMatchField,
  PayerStatus,
  PayerType,
  PaymentChannel,
  PaymentStatus,
  RateType,
  ReversalStatus,
} from '../enums';

/** Money crosses the wire as a decimal string, never a JS number (D9). */
export type MoneyString = string;

export interface PayerView {
  readonly id: string;
  readonly tin: string;
  readonly type: PayerType;
  readonly name: string;
  readonly nationalId: string | null;
  readonly registrationNo: string | null;
  readonly phone: string;
  readonly email: string | null;
  readonly address: string | null;
  readonly status: PayerStatus;
  readonly createdAt: Date | string;
}

export interface DuplicateFlagView {
  readonly id: string;
  readonly payer: PayerView;
  readonly matchedPayer: PayerView;
  readonly matchField: DuplicateMatchField;
  readonly status: DuplicateFlagStatus;
  readonly note: string | null;
  readonly reviewedAt: Date | string | null;
  readonly createdAt: Date | string;
}

export interface RegisteredPayer extends PayerView {
  /** Duplicate flags raised by this registration; empty when nothing matched. */
  readonly warnings: readonly DuplicateFlagView[];
}

export interface RevenueTypeView {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly rateType: RateType;
  readonly rate: MoneyString;
  readonly glCode: string;
  readonly active: boolean;
  readonly description: string | null;
}

export interface AssessmentView {
  readonly id: string;
  readonly controlNumber: string;
  readonly payer: Pick<PayerView, 'id' | 'tin' | 'name'>;
  readonly revenueType: Pick<RevenueTypeView, 'id' | 'code' | 'name'>;
  readonly period: string | null;
  readonly baseAmount: MoneyString | null;
  readonly amount: MoneyString;
  readonly currency: Currency;
  readonly dueDate: Date | string;
  readonly status: AssessmentStatus;
  readonly paidAmount: MoneyString;
  readonly outstanding: MoneyString;
  readonly notes: string | null;
  readonly createdAt: Date | string;
}

export interface PaymentView {
  readonly id: string;
  readonly controlNumber: string;
  readonly assessmentId: string | null;
  readonly billId: string | null;
  readonly payer: Pick<PayerView, 'id' | 'tin' | 'name'>;
  readonly revenueType: Pick<RevenueTypeView, 'id' | 'code' | 'name'> | null;
  readonly channel: PaymentChannel;
  readonly channelTxnRef: string | null;
  readonly amount: MoneyString;
  readonly currency: Currency;
  readonly fxRate: string;
  readonly localAmount: MoneyString;
  readonly status: PaymentStatus;
  readonly paidAt: Date | string | null;
  readonly capturedById: string | null;
  readonly bulkUploadId: string | null;
  readonly failureReason: string | null;
  readonly createdAt: Date | string;
}

export interface AssessmentDetail extends AssessmentView {
  readonly payments: readonly PaymentView[];
}

export interface PayerBalances {
  readonly assessedTotal: MoneyString;
  readonly paidTotal: MoneyString;
  readonly outstanding: MoneyString;
}

/** 360° view (brief Module 2) including water accounts and bills (Module 4). */
export interface PayerProfile {
  readonly payer: PayerView;
  readonly assessments: readonly AssessmentView[];
  readonly waterAccounts: readonly PayerWaterSummary[];
  readonly payments: readonly PaymentView[];
  readonly balances: PayerBalances;
}

export interface ReversalView {
  readonly id: string;
  readonly payment: PaymentView;
  readonly reason: string;
  readonly capturedById: string;
  readonly capturedByEmail: string | null;
  readonly status: ReversalStatus;
  readonly approvedById: string | null;
  readonly decidedAt: Date | string | null;
  readonly decisionNote: string | null;
  readonly createdAt: Date | string;
}

export interface CsvRejectedRow {
  readonly row: number;
  readonly field?: string;
  readonly reason: string;
  readonly message: string;
}

export interface CsvImportSummaryView {
  readonly totalRows: number;
  readonly accepted: number;
  readonly rejected: readonly CsvRejectedRow[];
  readonly dryRun: boolean;
  readonly uploadId?: string;
}

export interface BulkUploadView {
  readonly id: string;
  readonly kind: BulkUploadKind;
  readonly fileName: string;
  readonly totalRows: number;
  readonly accepted: number;
  readonly rejected: number;
  readonly uploadedById: string;
  readonly createdAt: Date | string;
  readonly summary?: CsvImportSummaryView;
}

/** `POST /payments/capture/lookup` — what the cashier sees before capturing. */
export interface ControlNumberLookup {
  readonly controlNumber: string;
  readonly kind: 'ASSESSMENT' | 'BILL';
  readonly payer: Pick<PayerView, 'id' | 'tin' | 'name'>;
  readonly description: string;
  readonly amount: MoneyString;
  readonly paidAmount: MoneyString;
  readonly outstanding: MoneyString;
  readonly currency: Currency;
  readonly status: AssessmentStatus | BillStatus;
}
