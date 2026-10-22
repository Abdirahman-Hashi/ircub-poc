import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import {
  ErrorCode,
  JournalBatchKind,
  JournalBatchStatus,
  type Paginated,
  PaymentStatus,
  REVENUE_TYPE_CODES,
} from '@ircub/shared';

import { AppException } from '../../common/errors/app.exception';
import { normaliseControlNumber } from '../../common/ids/ids.rules';
import { JOB } from '../../common/jobs/job-names';
import { JobsService } from '../../common/jobs/jobs.service';
import { parseSort, toPageSlice, toPaginated } from '../../common/pagination/pagination.rules';
import { EventBus } from '../../common/sse/event-bus';
import { SSE_EVENT } from '../../common/sse/event-names';
import { PrismaService } from '../../prisma/prisma.service';
import { utcDayBounds } from '../reconciliation/reconciliation.rules';
import { SystemConfigKey } from '../system-config/system-config.keys';
import { SystemConfigService } from '../system-config/system-config.service';

import { FMIS_API } from './fmis.constants';
import { FMIS_MESSAGES } from './fmis.messages';
import {
  collectionLine,
  daysBetween,
  eligibilityWindowStart,
  PRISMA_UNIQUE_VIOLATION,
  reversalLine,
  statusAfterReversal,
  sumAmounts,
  toDateKey,
} from './fmis.rules';
import { LINE_INCLUDE, toBatchView, toLineView } from './fmis.view';
import { GlMappingsService } from './gl-mappings.service';

import type { BuildRangeResponseDto } from './dto/build-range.response.dto';
import type { JournalBatchDetailResponseDto } from './dto/journal-batch-detail.response.dto';
import type { JournalBatchFilterDto } from './dto/journal-batch-filter.dto';
import type { JournalBatchResponseDto } from './dto/journal-batch.response.dto';
import type { JournalLineQueryDto } from './dto/journal-line-query.dto';
import type { JournalLineResponseDto } from './dto/journal-line.response.dto';
import type { EligiblePayment, LineDraft } from './fmis.types';
import type { TransactionClient } from '../../prisma/prisma.types';
import type { JournalBatch, Prisma } from '@prisma/client';

/**
 * Daily journal batches (brief Module 6; D11, D17). A batch is built in one transaction from
 * CONFIRMED payments of the day that have no journal line yet; the unique `JournalLine.paymentId`
 * and the one-COLLECTIONS-batch-per-day index are the hard guarantees against double posting,
 * so a race between the cron and a manual build surfaces as DUPLICATE_POSTING, never as two
 * postings. Approved reversals of posted payments produce a mirrored REVERSAL batch.
 */
@Injectable()
export class JournalBatchService {
  private readonly logger = new Logger(JournalBatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mappings: GlMappingsService,
    private readonly systemConfig: SystemConfigService,
    private readonly jobs: JobsService,
    private readonly events: EventBus,
  ) {}

  /** 00:30 daily for yesterday (D17). */
  @Cron(FMIS_API.DAILY_CRON)
  async buildDaily(): Promise<void> {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const batch = await this.buildForDate(toDateKey(yesterday));
    this.logger.log({
      msg: 'daily journal batch',
      date: toDateKey(yesterday),
      batchId: batch?.id ?? null,
    });
  }

  /**
   * Builds and enqueues posting; `null` when nothing is eligible. With `catchUp` (the default)
   * the batch also sweeps confirmed payments from the previous `FMIS_CATCH_UP_DAYS` days that
   * still have no journal line: late callbacks and back-dated captures are posted on the next
   * build instead of never.
   */
  async buildForDate(
    date: string,
    forceFailure = false,
    catchUp = true,
  ): Promise<JournalBatchResponseDto | null> {
    const batch = await this.createBatch(date, catchUp);
    if (batch === null) {
      return null;
    }
    await this.enqueuePosting(batch.id, forceFailure);
    this.events.emit(SSE_EVENT.FMIS_BATCH_UPDATED, { batchId: batch.id, status: batch.status });
    return toBatchView(batch);
  }

  /** Seed / backfill: one batch per day in the range; days with nothing eligible are skipped. */
  async buildRange(from: string, to: string, catchUp = true): Promise<BuildRangeResponseDto> {
    const days = this.rangeDays(from, to, FMIS_API.MAX_BUILD_DAYS);
    const built: JournalBatchResponseDto[] = [];
    for (const day of days) {
      const batch = await this.buildForDate(day, false, catchUp);
      if (batch !== null) {
        built.push(batch);
      }
    }
    return { built, skipped: days.length - built.length };
  }

  /** Re-enqueues a FAILED batch; attempts restart from zero. */
  async retry(id: string): Promise<JournalBatchResponseDto> {
    const batch = await this.findOrThrow(id);
    if (batch.status !== JournalBatchStatus.FAILED) {
      throw new AppException(
        ErrorCode.PAYMENT_INVALID_STATE,
        FMIS_MESSAGES.NOT_RETRYABLE,
        HttpStatus.CONFLICT,
        { id, status: batch.status },
      );
    }
    const updated = await this.prisma.journalBatch.update({
      where: { id },
      data: { status: JournalBatchStatus.PENDING, attempts: 0 },
    });
    await this.enqueuePosting(id, false);
    this.events.emit(SSE_EVENT.FMIS_BATCH_UPDATED, { batchId: id, status: updated.status });
    this.logger.log({ msg: 'journal batch retry requested', batchId: id });
    return toBatchView(updated);
  }

  /**
   * Phase 2 hook: an approved reversal of a posted payment is mirrored in a REVERSAL batch for
   * today (debit and credit swapped, amount stays positive) and the original batch becomes
   * REVERSED only once all its lines are reversed. Payments never posted need nothing: REVERSED
   * payments are not eligible for building.
   */
  async onReversalApproved(
    reversalId: string,
    paymentId: string,
  ): Promise<JournalBatchResponseDto | null> {
    const original = await this.prisma.journalLine.findUnique({
      where: { paymentId },
      include: { batch: true },
    });
    if (
      original === null ||
      original.batch.status === JournalBatchStatus.PENDING ||
      original.batch.status === JournalBatchStatus.FAILED
    ) {
      if (original !== null) {
        // Not yet posted: the line is dropped from the pending batch instead of reversed.
        await this.prisma.journalLine.delete({ where: { id: original.id } });
        await this.refreshTotals(this.prisma, original.batchId);
        this.logger.log({
          msg: 'journal line dropped before posting',
          lineId: original.id,
          batchId: original.batchId,
          reversalId,
        });
      }
      return null;
    }
    const today = toDateKey(new Date());
    const draft: LineDraft = reversalLine(
      {
        paymentId,
        reversalId: null,
        revenueTypeId: original.revenueTypeId,
        glCode: original.glCode,
        debitGl: original.debitGl,
        creditGl: original.creditGl,
        amount: original.amount.toFixed(),
        currency: original.currency,
        reference: original.reference,
      },
      reversalId,
    );
    const batch = await this.prisma.$transaction(async (tx) => {
      const created = await tx.journalBatch.create({
        data: {
          batchDate: new Date(today),
          kind: JournalBatchKind.REVERSAL,
          lineCount: 1,
          totalLocal: draft.amount,
        },
      });
      await tx.journalLine.create({ data: { ...draft, batchId: created.id } });
      await tx.journalLine.update({ where: { id: original.id }, data: { reversed: true } });
      const siblings = await tx.journalLine.findMany({
        where: { batchId: original.batchId },
        select: { reversed: true },
      });
      const nextStatus = statusAfterReversal(siblings.map((line) => line.reversed));
      await tx.journalBatch.update({
        where: { id: original.batchId },
        data:
          nextStatus === JournalBatchStatus.REVERSED
            ? { status: nextStatus, reversedByBatchId: created.id }
            : {},
      });
      return created;
    });
    await this.enqueuePosting(batch.id, false);
    this.events.emit(SSE_EVENT.FMIS_BATCH_UPDATED, { batchId: batch.id, status: batch.status });
    this.logger.log({
      msg: 'reversal batch created',
      batchId: batch.id,
      reversalId,
      originalBatchId: original.batchId,
    });
    return toBatchView(batch);
  }

  async list(filter: JournalBatchFilterDto): Promise<Paginated<JournalBatchResponseDto>> {
    const where: Prisma.JournalBatchWhereInput = {
      ...(filter.status === undefined ? {} : { status: filter.status }),
      ...(filter.kind === undefined ? {} : { kind: filter.kind }),
      ...(filter.dateFrom === undefined && filter.dateTo === undefined
        ? {}
        : {
            batchDate: {
              ...(filter.dateFrom === undefined ? {} : { gte: new Date(filter.dateFrom) }),
              ...(filter.dateTo === undefined ? {} : { lte: new Date(filter.dateTo) }),
            },
          }),
    };
    const sort = parseSort(filter.sort, FMIS_API.SORTABLE, {
      field: 'batchDate',
      direction: 'desc',
    });
    const { skip, take } = toPageSlice(filter.page, filter.pageSize);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.journalBatch.findMany({
        where,
        skip,
        take,
        orderBy: [{ [sort.field]: sort.direction }, { createdAt: 'desc' }],
      }),
      this.prisma.journalBatch.count({ where }),
    ]);
    return toPaginated(rows.map(toBatchView), total, filter.page, filter.pageSize);
  }

  async get(id: string): Promise<JournalBatchDetailResponseDto> {
    const batch = await this.findOrThrow(id);
    const lines = await this.prisma.journalLine.findMany({
      where: { batchId: id },
      orderBy: { reference: 'asc' },
      include: LINE_INCLUDE,
    });
    return Object.assign(toBatchView(batch), { lines: lines.map(toLineView) });
  }

  /** Traceability lookup: by payment id or control number (collection and reversal lines). */
  async lines(query: JournalLineQueryDto): Promise<JournalLineResponseDto[]> {
    const where: Prisma.JournalLineWhereInput = {
      ...(query.paymentId === undefined
        ? {}
        : { OR: [{ paymentId: query.paymentId }, { reversal: { paymentId: query.paymentId } }] }),
      ...(query.controlNumber === undefined
        ? {}
        : { reference: normaliseControlNumber(query.controlNumber) }),
    };
    const rows = await this.prisma.journalLine.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: LINE_INCLUDE,
    });
    return rows.map(toLineView);
  }

  async findOrThrow(id: string): Promise<JournalBatch> {
    const batch = await this.prisma.journalBatch.findUnique({ where: { id } });
    if (batch === null) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        FMIS_MESSAGES.BATCH_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        { id },
      );
    }
    return batch;
  }

  private async createBatch(date: string, catchUp: boolean): Promise<JournalBatch | null> {
    const [cashGl, localCurrency, catchUpDays] = await Promise.all([
      this.systemConfig.get(SystemConfigKey.CASH_GL_CODE),
      this.systemConfig.get(SystemConfigKey.LOCAL_CURRENCY),
      this.systemConfig.get(SystemConfigKey.FMIS_CATCH_UP_DAYS),
    ]);
    const onDate = new Date(date);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const eligible = await this.eligiblePayments(tx, date, catchUp ? catchUpDays : 0);
        if (eligible.length === 0) {
          return null;
        }
        const drafts: LineDraft[] = [];
        for (const payment of eligible) {
          const mapping = await this.mappings.resolve(tx, payment.revenueTypeId, onDate);
          drafts.push(collectionLine(payment, mapping.glCode, cashGl, localCurrency));
        }
        const batch = await tx.journalBatch.create({
          data: {
            batchDate: onDate,
            kind: JournalBatchKind.COLLECTIONS,
            lineCount: drafts.length,
            totalLocal: sumAmounts(drafts),
          },
        });
        await tx.journalLine.createMany({
          data: drafts.map((draft) => ({ ...draft, batchId: batch.id })),
        });
        this.logger.log({
          msg: 'journal batch built',
          batchId: batch.id,
          date,
          lines: drafts.length,
        });
        return batch;
      });
    } catch (error: unknown) {
      if (
        (error as Prisma.PrismaClientKnownRequestError | null)?.code === PRISMA_UNIQUE_VIOLATION
      ) {
        throw new AppException(
          ErrorCode.DUPLICATE_POSTING,
          FMIS_MESSAGES.DUPLICATE_POSTING,
          HttpStatus.CONFLICT,
          { date },
        );
      }
      throw error;
    }
  }

  /**
   * CONFIRMED payments with no journal line (LEFT JOIN … IS NULL) paid on the day, or within
   * the catch-up window before it.
   */
  private async eligiblePayments(
    tx: TransactionClient,
    date: string,
    catchUpDays: number,
  ): Promise<EligiblePayment[]> {
    const { end } = utcDayBounds(date);
    const rows = await tx.payment.findMany({
      where: {
        status: PaymentStatus.CONFIRMED,
        paidAt: { gte: eligibilityWindowStart(date, catchUpDays), lt: end },
        journalLine: null,
      },
      select: {
        id: true,
        controlNumber: true,
        localAmount: true,
        assessment: { select: { revenueTypeId: true } },
        billId: true,
      },
      orderBy: { paidAt: 'asc' },
    });
    const waterTypeId = rows.some((row) => row.assessment === null)
      ? await this.waterRevenueTypeId(tx)
      : null;
    return rows.map((row) => {
      const revenueTypeId = row.assessment?.revenueTypeId ?? waterTypeId;
      if (revenueTypeId === null) {
        throw new AppException(
          ErrorCode.GL_MAPPING_MISSING,
          FMIS_MESSAGES.WATER_TYPE_MISSING,
          HttpStatus.UNPROCESSABLE_ENTITY,
          { paymentId: row.id },
        );
      }
      return {
        id: row.id,
        controlNumber: row.controlNumber,
        localAmount: row.localAmount,
        revenueTypeId,
      };
    });
  }

  private async waterRevenueTypeId(tx: TransactionClient): Promise<string | null> {
    const water = await tx.revenueType.findUnique({
      where: { code: REVENUE_TYPE_CODES.WATER },
      select: { id: true },
    });
    return water?.id ?? null;
  }

  private async refreshTotals(
    tx: TransactionClient | PrismaService,
    batchId: string,
  ): Promise<void> {
    const lines = await tx.journalLine.findMany({ where: { batchId }, select: { amount: true } });
    await tx.journalBatch.update({
      where: { id: batchId },
      data: { lineCount: lines.length, totalLocal: sumAmounts(lines) },
    });
  }

  private async enqueuePosting(batchId: string, forceFailure: boolean): Promise<void> {
    const [retryLimit, retryDelay] = await Promise.all([
      this.systemConfig.get(SystemConfigKey.FMIS_POST_RETRY_LIMIT),
      this.systemConfig.get(SystemConfigKey.FMIS_POST_RETRY_DELAY_SECONDS),
    ]);
    await this.jobs.enqueue(
      JOB.FMIS_POST_BATCH,
      { batchId, forceFailure },
      { retryLimit, retryDelay, retryBackoff: true },
    );
  }

  private rangeDays(from: string, to: string, maxDays: number): string[] {
    if (from > to) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        FMIS_MESSAGES.RANGE_INVERTED,
        HttpStatus.BAD_REQUEST,
        { from, to },
      );
    }
    const days = daysBetween(from, to);
    if (days.length > maxDays) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        FMIS_MESSAGES.RANGE_TOO_LONG,
        HttpStatus.BAD_REQUEST,
        { from, to, maxDays },
      );
    }
    return days;
  }
}
