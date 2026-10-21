import type { PaymentResponseDto } from './dto/payment.response.dto';
import type { PaymentWithRelations } from './payments.types';

export const PAYMENT_INCLUDE = {
  payer: { select: { id: true, tin: true, name: true } },
  assessment: { select: { revenueType: { select: { id: true, code: true, name: true } } } },
} as const;

export function toPaymentView(row: PaymentWithRelations): PaymentResponseDto {
  return {
    id: row.id,
    controlNumber: row.controlNumber,
    assessmentId: row.assessmentId,
    billId: row.billId,
    payer: row.payer,
    revenueType: row.assessment?.revenueType ?? null,
    channel: row.channel,
    channelTxnRef: row.channelTxnRef,
    amount: row.amount.toFixed(),
    currency: row.currency,
    fxRate: row.fxRate.toFixed(),
    localAmount: row.localAmount.toFixed(),
    status: row.status,
    paidAt: row.paidAt,
    capturedById: row.capturedById,
    bulkUploadId: row.bulkUploadId,
    failureReason: row.failureReason,
    createdAt: row.createdAt,
  };
}
