import type { GlMappingResponseDto } from './dto/gl-mapping.response.dto';
import type { JournalBatchResponseDto } from './dto/journal-batch.response.dto';
import type { JournalLineResponseDto } from './dto/journal-line.response.dto';
import type { GlMappingWithType, JournalBatchRow, JournalLineWithRelations } from './fmis.types';
import type { Prisma } from '@prisma/client';

const PAYMENT_SELECT = {
  id: true,
  controlNumber: true,
  channel: true,
  paidAt: true,
  payer: { select: { id: true, name: true, tin: true } },
} as const;

export const MAPPING_INCLUDE = {
  revenueType: { select: { code: true, name: true } },
} satisfies Prisma.GlMappingInclude;

export const LINE_INCLUDE = {
  revenueType: { select: { code: true, name: true } },
  payment: { select: PAYMENT_SELECT },
  reversal: { select: { payment: { select: PAYMENT_SELECT } } },
} satisfies Prisma.JournalLineInclude;

export function toMappingView(row: GlMappingWithType): GlMappingResponseDto {
  return {
    id: row.id,
    revenueTypeId: row.revenueTypeId,
    revenueType: row.revenueType,
    glCode: row.glCode,
    glName: row.glName,
    effectiveFrom: row.effectiveFrom,
    createdAt: row.createdAt,
  };
}

export function toBatchView(row: JournalBatchRow): JournalBatchResponseDto {
  return {
    id: row.id,
    batchDate: row.batchDate,
    kind: row.kind,
    status: row.status,
    lineCount: row.lineCount,
    totalLocal: row.totalLocal.toFixed(),
    fmisReference: row.fmisReference,
    postedAt: row.postedAt,
    attempts: row.attempts,
    lastError: row.lastError,
    reversedByBatchId: row.reversedByBatchId,
    createdAt: row.createdAt,
  };
}

export function toLineView(row: JournalLineWithRelations): JournalLineResponseDto {
  return {
    id: row.id,
    batchId: row.batchId,
    paymentId: row.paymentId,
    reversalId: row.reversalId,
    revenueType: row.revenueType,
    glCode: row.glCode,
    debitGl: row.debitGl,
    creditGl: row.creditGl,
    amount: row.amount.toFixed(),
    currency: row.currency,
    reference: row.reference,
    reversed: row.reversed,
    payment: row.payment ?? row.reversal?.payment ?? null,
  };
}
