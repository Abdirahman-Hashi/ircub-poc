import { AMOUNT_SCALE } from '../../common/money/money.constants';

import type { ReconciliationLineResponseDto } from './dto/reconciliation-line.response.dto';
import type { ReconciliationRunResponseDto } from './dto/reconciliation-run.response.dto';
import type {
  ReconciliationLineWithRelations,
  ReconciliationRunWithStatement,
} from './reconciliation.types';
import type { Prisma } from '@prisma/client';

export const RUN_INCLUDE = {
  statement: { select: { fileName: true } },
} satisfies Prisma.ReconciliationRunInclude;

export const LINE_INCLUDE = {
  payment: { select: { controlNumber: true, currency: true } },
  statementLine: { select: { controlNumber: true, currency: true } },
} satisfies Prisma.ReconciliationLineInclude;

export function toRunView(row: ReconciliationRunWithStatement): ReconciliationRunResponseDto {
  return {
    id: row.id,
    channel: row.channel,
    runDate: row.runDate,
    status: row.status,
    matched: row.matched,
    missingInIrcub: row.missingInIrcub,
    missingInChannel: row.missingInChannel,
    amountMismatch: row.amountMismatch,
    statementFileName: row.statement?.fileName ?? null,
    error: row.error,
    createdAt: row.createdAt,
  };
}

export function toLineView(row: ReconciliationLineWithRelations): ReconciliationLineResponseDto {
  return {
    id: row.id,
    status: row.status,
    txnRef: row.txnRef,
    paymentId: row.paymentId,
    controlNumber: row.payment?.controlNumber ?? row.statementLine?.controlNumber ?? null,
    ircubAmount: row.ircubAmount?.toFixed(AMOUNT_SCALE) ?? null,
    channelAmount: row.channelAmount?.toFixed(AMOUNT_SCALE) ?? null,
    currency: row.payment?.currency ?? row.statementLine?.currency ?? null,
    note: row.note,
  };
}
