import type {
  ReconciliationLineView,
  ReconciliationRunView,
  AssessmentStatus,
  Currency,
  DuplicateFlagStatus,
  PayerStatus,
  PayerType,
  PaymentChannel,
  PaymentStatus,
  RateType,
  ReversalStatus,
} from '@ircub/shared';

export interface PayerListParams {
  readonly page: number;
  readonly pageSize: number;
  readonly search?: string;
  readonly type?: PayerType;
  readonly status?: PayerStatus;
}

export interface CreatePayerInput {
  readonly type: PayerType;
  readonly name: string;
  readonly phone: string;
  readonly email?: string;
  readonly nationalId?: string;
  readonly registrationNo?: string;
  readonly address?: string;
}

export interface DuplicateListParams {
  readonly page: number;
  readonly pageSize: number;
  readonly status?: DuplicateFlagStatus;
}

export interface RevenueTypeInput {
  readonly code: string;
  readonly name: string;
  readonly rateType: RateType;
  readonly rate: string;
  readonly glCode: string;
  readonly description?: string;
}

export interface AssessmentListParams {
  readonly page: number;
  readonly pageSize: number;
  readonly sort?: string;
  readonly payerId?: string;
  readonly tin?: string;
  readonly revenueTypeId?: string;
  readonly amountMin?: string;
  readonly amountMax?: string;
  readonly status?: AssessmentStatus;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly dueFrom?: string;
  readonly dueTo?: string;
  readonly controlNumber?: string;
}

export interface CreateAssessmentInput {
  readonly payerId: string;
  readonly revenueTypeId: string;
  readonly baseAmount?: string;
  readonly period?: string;
  readonly dueDate?: string;
  readonly notes?: string;
}

export interface PaymentListParams {
  readonly page: number;
  readonly pageSize: number;
  readonly sort?: string;
  readonly payerId?: string;
  readonly revenueTypeId?: string;
  readonly amountMin?: string;
  readonly amountMax?: string;
  readonly channel?: PaymentChannel;
  readonly status?: PaymentStatus;
  readonly currency?: Currency;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly controlNumber?: string;
  readonly bulkUploadId?: string;
}

export interface CapturePaymentInput {
  readonly controlNumber: string;
  readonly amount: string;
  readonly currency: Currency;
  readonly channel: PaymentChannel;
  readonly channelTxnRef?: string;
  readonly paidAt?: string;
}

export interface ReversalListParams {
  readonly page: number;
  readonly pageSize: number;
  readonly status?: ReversalStatus;
  readonly payerId?: string;
}

export interface PageParams {
  readonly page: number;
  readonly pageSize: number;
}

export interface ReconciliationRunParams {
  readonly page: number;
  readonly pageSize: number;
  readonly channel?: string;
  readonly status?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
}

export interface RunReconciliationInput {
  readonly channel: PaymentChannel;
  readonly date: string;
  readonly perturb?: boolean;
}

export interface ChannelStatementView {
  readonly id: string;
  readonly channel: PaymentChannel;
  readonly statementDate: string;
  readonly fileName: string;
  readonly lineCount: number;
  readonly createdAt: string;
}

export interface ReconciliationRunDetail extends ReconciliationRunView {
  readonly lines: readonly ReconciliationLineView[];
}

export interface JournalBatchParams {
  readonly page: number;
  readonly pageSize: number;
  readonly status?: string;
  readonly kind?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
}

export interface CreateGlMappingInput {
  readonly revenueTypeId: string;
  readonly glCode: string;
  readonly glName: string;
  readonly effectiveFrom: string;
}
