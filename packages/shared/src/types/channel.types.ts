import type { ScenarioOutcome } from '../constants/channel.constants';
import type {
  ChannelOutcome,
  Currency,
  PaymentChannel,
  ReconciliationLineStatus,
  ReconciliationRunStatus,
} from '../enums';
import type { MoneyString } from './registry.types';

export interface ChannelInitiateRequest {
  readonly amount: MoneyString;
  readonly currency: Currency;
  readonly controlNumber: string;
  readonly callbackUrl: string;
  readonly payerPhone?: string;
}

export interface ChannelInitiateResponse {
  readonly txnRef: string;
  readonly status: ChannelOutcome;
}

export interface ChannelStatusResponse {
  readonly txnRef: string;
  readonly status: ChannelOutcome;
  readonly amount: MoneyString;
  readonly currency: Currency;
  readonly controlNumber: string;
  readonly paidAt: string | null;
}

/** Body the channel posts to `callbackUrl`, signed in `x-signature`. */
export interface ChannelCallbackPayload {
  readonly txnRef: string;
  readonly status: 'SUCCESS' | 'FAILED';
  readonly amount: MoneyString;
  readonly currency: Currency;
  readonly controlNumber: string;
  readonly paidAt: string;
}

export interface ScenarioRequest {
  readonly txnRef: string;
  readonly outcome: ScenarioOutcome;
}

export interface SeedStatementLine {
  readonly txnRef: string;
  readonly date: string;
  readonly amount: MoneyString;
  readonly currency: Currency;
  readonly controlNumber: string;
}

export interface SeedStatementRequest {
  readonly channel: PaymentChannel;
  readonly lines: readonly SeedStatementLine[];
}

export interface FxRateView {
  readonly base: Currency;
  readonly quote: Currency;
  readonly rate: string;
  readonly asOf: Date | string;
  readonly source: string;
  /** True when the provider was unreachable and a stored rate older than the stale window was used. */
  readonly stale: boolean;
}

export interface InitiatePaymentInput {
  readonly controlNumber: string;
  readonly amount: MoneyString;
  readonly currency: Currency;
  readonly channel: PaymentChannel;
  readonly payerPhone?: string;
}

export interface ReconciliationRunView {
  readonly id: string;
  readonly channel: PaymentChannel;
  readonly runDate: Date | string;
  readonly status: ReconciliationRunStatus;
  readonly matched: number;
  readonly missingInIrcub: number;
  readonly missingInChannel: number;
  readonly amountMismatch: number;
  readonly statementFileName: string | null;
  readonly error: string | null;
  readonly createdAt: Date | string;
}

export interface ReconciliationLineView {
  readonly id: string;
  readonly status: ReconciliationLineStatus;
  readonly txnRef: string;
  readonly paymentId: string | null;
  readonly controlNumber: string | null;
  readonly ircubAmount: MoneyString | null;
  readonly channelAmount: MoneyString | null;
  readonly currency: Currency | null;
  readonly note: string | null;
}

export interface PaymentChannelDetail {
  readonly channelRequestPayload: unknown;
  readonly callbackPayload: unknown;
  readonly statusCheckAttempts: number;
  readonly lastStatusCheckAt: Date | string | null;
  readonly permanentlyFailedAt: Date | string | null;
}
