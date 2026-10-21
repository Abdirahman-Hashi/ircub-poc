import type { REVERSALS_API } from './reversals.constants';
import type { PAYMENT_INCLUDE } from '../payments/payments.view';
import type { Prisma } from '@prisma/client';

export type ReversalSortField = (typeof REVERSALS_API.SORTABLE)[number];

export type ReversalWithPayment = Prisma.ReversalGetPayload<{
  include: { payment: { include: typeof PAYMENT_INCLUDE } };
}>;
