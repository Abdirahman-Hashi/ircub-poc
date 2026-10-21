import type { Currency, PaymentChannel } from '@ircub/shared';

import type { PAYMENTS_API } from './payments.constants';
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
  readonly assessmentId: string;
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
