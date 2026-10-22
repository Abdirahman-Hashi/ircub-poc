import type { ChannelOutcome, Currency, PaymentChannel, PaymentStatus } from '@ircub/shared';

import type { PAYMENTS_API } from './payments.constants';
import type { DecimalLike } from '../../common/money/money.types';
import type { Prisma } from '@prisma/client';
import type { Decimal } from 'decimal.js';

export type PaymentSortField = (typeof PAYMENTS_API.SORTABLE)[number];

export type PaymentWithRelations = Prisma.PaymentGetPayload<{
  include: {
    payer: { select: { id: true; tin: true; name: true } };
    assessment: { select: { revenueType: { select: { id: true; code: true; name: true } } } };
  };
}>;

/** One confirmed payment to record and apply; used by manual capture and the bulk importer. */
export interface ConfirmedPaymentInput {
  readonly assessmentId: string | null;
  readonly billId: string | null;
  readonly payerId: string;
  readonly controlNumber: string;
  readonly channel: PaymentChannel;
  readonly channelTxnRef: string | null;
  readonly amount: Decimal;
  readonly currency: Currency;
  readonly paidAt: Date;
  readonly capturedById: string | null;
  readonly bulkUploadId: string | null;
}

export interface PaymentLedgerSnapshot {
  readonly status: PaymentStatus;
  readonly amount: DecimalLike;
  readonly currency: Currency;
}

/** A final answer from a channel (callback or status check); PENDING is not a settlement. */
export interface SettlementOutcome {
  readonly status: Exclude<ChannelOutcome, 'PENDING'>;
  readonly amount: DecimalLike;
  readonly currency: Currency;
  readonly paidAt?: string | null;
}

export type SettlementDecision = 'DUPLICATE' | 'FAIL' | 'MISMATCH' | 'CONFIRM';

export interface StatusCheckProgress {
  readonly attempts: number;
  readonly exhausted: boolean;
}

export type SettlementSource = 'CALLBACK' | 'STATUS_CHECK';

export interface SettlementResult {
  readonly paymentId: string;
  readonly duplicate: boolean;
  readonly status: PaymentStatus;
}

/** What a status check needs from the payment row. */
export type PaymentForStatusCheck = Pick<
  Prisma.PaymentGetPayload<object>,
  | 'id'
  | 'payerId'
  | 'channel'
  | 'channelTxnRef'
  | 'controlNumber'
  | 'status'
  | 'statusCheckAttempts'
  | 'localAmount'
>;
