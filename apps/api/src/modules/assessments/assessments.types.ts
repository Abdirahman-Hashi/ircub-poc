import type { AssessmentStatus } from '@ircub/shared';

import type { ASSESSMENTS_API } from './assessments.constants';
import type { Prisma } from '@prisma/client';
import type { Decimal } from 'decimal.js';

export type AssessmentSortField = (typeof ASSESSMENTS_API.SORTABLE)[number];

export type AssessmentWithRelations = Prisma.AssessmentGetPayload<{
  include: {
    payer: { select: { id: true; tin: true; name: true } };
    revenueType: { select: { id: true; code: true; name: true } };
  };
}>;

/** The three fields payment application reads and writes. */
export interface AssessmentLedger {
  readonly amount: Decimal;
  readonly paidAmount: Decimal;
  readonly status: AssessmentStatus;
}

export type ApplyPaymentResult =
  | { readonly ok: true; readonly paidAmount: Decimal; readonly status: AssessmentStatus }
  | { readonly ok: false; readonly outstanding: Decimal };
