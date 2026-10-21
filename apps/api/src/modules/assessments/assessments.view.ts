import { outstandingOf } from './assessments.rules';

import type { AssessmentWithRelations } from './assessments.types';
import type { AssessmentResponseDto } from './dto/assessment.response.dto';

export const ASSESSMENT_INCLUDE = {
  payer: { select: { id: true, tin: true, name: true } },
  revenueType: { select: { id: true, code: true, name: true } },
} as const;

export function toAssessmentView(row: AssessmentWithRelations): AssessmentResponseDto {
  return {
    id: row.id,
    controlNumber: row.controlNumber,
    payer: row.payer,
    revenueType: row.revenueType,
    period: row.period,
    baseAmount: row.baseAmount?.toFixed() ?? null,
    amount: row.amount.toFixed(),
    currency: row.currency,
    dueDate: row.dueDate,
    status: row.status,
    paidAmount: row.paidAmount.toFixed(),
    outstanding: outstandingOf(row.amount, row.paidAmount).toFixed(),
    notes: row.notes,
    createdAt: row.createdAt,
  };
}

export { outstandingOf };
