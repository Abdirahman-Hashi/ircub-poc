import type { ChannelOutcome, Currency, PaymentChannel, ScenarioOutcome } from '@ircub/shared';

export interface MockPayment {
  readonly txnRef: string;
  readonly channel: PaymentChannel;
  readonly amount: string;
  readonly currency: Currency;
  readonly controlNumber: string;
  readonly callbackUrl: string | null;
  status: ChannelOutcome;
  paidAt: string | null;
  readonly createdAt: string;
  /** Number of status checks served so far (drives the `.77` PENDING-then-SUCCESS behaviour). */
  statusChecks: number;
  scenario: ScenarioOutcome | null;
}

export interface StatementLine {
  readonly txnRef: string;
  readonly date: string;
  readonly amount: string;
  readonly currency: Currency;
  readonly controlNumber: string;
  readonly status: ChannelOutcome;
}

/** What the amount suffix implies for a new payment. */
export interface AmountScenario {
  readonly outcome: 'SUCCESS' | 'FAILED';
  readonly sendCallback: boolean;
  readonly statusCheckErrors: boolean;
}

export interface ChannelSpec {
  readonly channel: PaymentChannel;
  readonly refPrefix: string;
}
