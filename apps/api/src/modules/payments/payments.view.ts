import type { PaymentDetailResponseDto } from './dto/payment-detail.response.dto';
import type { PaymentResponseDto } from './dto/payment.response.dto';
import type { PaymentDetailWithRelations, PaymentWithRelations } from './payments.types';

export const PAYMENT_INCLUDE = {
  payer: { select: { id: true, tin: true, name: true } },
  assessment: { select: { revenueType: { select: { id: true, code: true, name: true } } } },
} as const;

/** Detail view adds the FMIS posting of the payment (phase 5 traceability). */
export const PAYMENT_DETAIL_INCLUDE = {
  ...PAYMENT_INCLUDE,
  journalLine: {
    select: {
      id: true,
      reversed: true,
      batch: { select: { id: true, batchDate: true, status: true, fmisReference: true } },
    },
  },
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
    statusCheckAttempts: row.statusCheckAttempts,
    createdAt: row.createdAt,
  };
}

export function toPaymentDetail(row: PaymentDetailWithRelations): PaymentDetailResponseDto {
  const line = row.journalLine;
  return Object.assign(toPaymentView(row), {
    channelRequestPayload: row.channelRequestPayload,
    callbackPayload: row.callbackPayload,
    lastStatusCheckAt: row.lastStatusCheckAt,
    permanentlyFailedAt: row.permanentlyFailedAt,
    journalLine:
      line === null
        ? null
        : {
            lineId: line.id,
            batchId: line.batch.id,
            batchDate: line.batch.batchDate,
            batchStatus: line.batch.status,
            fmisReference: line.batch.fmisReference,
            reversed: line.reversed,
          },
  });
}
