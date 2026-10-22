import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { ErrorCode, type Paginated, PaymentStatus, ReversalStatus } from '@ircub/shared';

import { AppException } from '../../common/errors/app.exception';
import { toDecimal } from '../../common/money/money.rules';
import { parseSort, toPageSlice, toPaginated } from '../../common/pagination/pagination.rules';
import { PrismaService } from '../../prisma/prisma.service';
import { AssessmentsService } from '../assessments/assessments.service';
import { SummaryService } from '../dashboard/summary.service';
import { JournalBatchService } from '../fmis/journal-batch.service';
import { PaymentsService } from '../payments/payments.service';
import { PAYMENT_INCLUDE, toPaymentView } from '../payments/payments.view';
import { BillsService } from '../water/bills/bills.service';

import { REVERSALS_API } from './reversals.constants';
import { REVERSALS_MESSAGES } from './reversals.messages';
import { isDecided, isReversible, violatesSegregation } from './reversals.rules';

import type { CreateReversalDto } from './dto/create-reversal.dto';
import type { DecideReversalDto } from './dto/decide-reversal.dto';
import type { ReversalFilterDto } from './dto/reversal-filter.dto';
import type { ReversalResponseDto } from './dto/reversal.response.dto';
import type { ReversalWithPayment } from './reversals.types';
import type { TransactionClient } from '../../prisma/prisma.types';
import type { Prisma } from '@prisma/client';

const REVERSAL_INCLUDE = { payment: { include: PAYMENT_INCLUDE } } as const;

/**
 * Reversal capture and approval with the per-record segregation-of-duties rule (brief
 * Module 1 & 3, D7). Phase 5 hooks FMIS reversal batches onto approval.
 */
@Injectable()
export class ReversalsService {
  private readonly logger = new Logger(ReversalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly assessments: AssessmentsService,
    private readonly bills: BillsService,
    private readonly journals: JournalBatchService,
    private readonly summaries: SummaryService,
  ) {}

  async create(dto: CreateReversalDto, actorId: string): Promise<ReversalResponseDto> {
    const payment = await this.payments.findOrThrow(dto.paymentId);
    if (!isReversible(payment.status)) {
      throw new AppException(
        ErrorCode.PAYMENT_NOT_REVERSIBLE,
        REVERSALS_MESSAGES.PAYMENT_NOT_REVERSIBLE,
        HttpStatus.CONFLICT,
        {
          paymentId: payment.id,
          status: payment.status,
        },
      );
    }
    const pending = await this.prisma.reversal.findFirst({
      where: { paymentId: payment.id, status: ReversalStatus.PENDING_APPROVAL },
    });
    if (pending !== null) {
      throw new AppException(
        ErrorCode.REVERSAL_PENDING_EXISTS,
        REVERSALS_MESSAGES.PENDING_EXISTS,
        HttpStatus.CONFLICT,
        {
          reversalId: pending.id,
        },
      );
    }
    const reversal = await this.prisma.reversal.create({
      data: { paymentId: payment.id, reason: dto.reason.trim(), capturedById: actorId },
      include: REVERSAL_INCLUDE,
    });
    this.logger.log({
      msg: 'reversal captured',
      reversalId: reversal.id,
      paymentId: payment.id,
      capturedById: actorId,
    });
    return this.toView(reversal);
  }

  async approve(id: string, dto: DecideReversalDto, actorId: string): Promise<ReversalResponseDto> {
    await this.pendingForDecision(id, actorId);
    const updated = await this.prisma.$transaction(async (tx) => {
      // Re-check under the row lock: two approvals racing on the same reversal would otherwise
      // both reduce the ledger.
      await this.lockForUpdate(tx, id);
      const reversal = await this.pendingForDecision(id, actorId, tx);
      if (reversal.payment.assessmentId !== null) {
        await this.assessments.reversePayment(
          tx,
          reversal.payment.assessmentId,
          toDecimal(reversal.payment.localAmount),
        );
      } else if (reversal.payment.billId !== null) {
        await this.bills.reversePayment(
          tx,
          reversal.payment.billId,
          toDecimal(reversal.payment.localAmount),
        );
      }
      await tx.payment.update({
        where: { id: reversal.paymentId },
        data: { status: PaymentStatus.REVERSED },
      });
      return tx.reversal.update({
        where: { id },
        data: {
          status: ReversalStatus.APPROVED,
          approvedById: actorId,
          decidedAt: new Date(),
          decisionNote: dto.note ?? null,
        },
        include: REVERSAL_INCLUDE,
      });
    });
    this.logger.log({
      msg: 'reversal approved',
      reversalId: id,
      paymentId: updated.paymentId,
      approvedById: actorId,
    });
    // FMIS mirror (phase 5): outside the ledger transaction so a posting problem never undoes the approval.
    await this.journals.onReversalApproved(id, updated.paymentId);
    this.summaries.markDirty(new Date());
    return this.toView(updated);
  }

  async reject(id: string, dto: DecideReversalDto, actorId: string): Promise<ReversalResponseDto> {
    await this.pendingForDecision(id, actorId);
    const updated = await this.prisma.$transaction(async (tx) => {
      await this.lockForUpdate(tx, id);
      await this.pendingForDecision(id, actorId, tx);
      return tx.reversal.update({
        where: { id },
        data: {
          status: ReversalStatus.REJECTED,
          approvedById: actorId,
          decidedAt: new Date(),
          decisionNote: dto.note ?? null,
        },
        include: REVERSAL_INCLUDE,
      });
    });
    this.logger.log({ msg: 'reversal rejected', reversalId: id, decidedById: actorId });
    return this.toView(updated);
  }

  async list(filter: ReversalFilterDto): Promise<Paginated<ReversalResponseDto>> {
    const where: Prisma.ReversalWhereInput = {
      ...(filter.status === undefined ? {} : { status: filter.status }),
      ...(filter.capturedById === undefined ? {} : { capturedById: filter.capturedById }),
      ...(filter.payerId === undefined ? {} : { payment: { payerId: filter.payerId } }),
      ...(filter.dateFrom === undefined && filter.dateTo === undefined
        ? {}
        : {
            createdAt: {
              ...(filter.dateFrom === undefined ? {} : { gte: filter.dateFrom }),
              ...(filter.dateTo === undefined ? {} : { lte: filter.dateTo }),
            },
          }),
    };
    const sort = parseSort(filter.sort, REVERSALS_API.SORTABLE, {
      field: 'createdAt',
      direction: 'desc',
    });
    const { skip, take } = toPageSlice(filter.page, filter.pageSize);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.reversal.findMany({
        where,
        skip,
        take,
        orderBy: { [sort.field]: sort.direction },
        include: REVERSAL_INCLUDE,
      }),
      this.prisma.reversal.count({ where }),
    ]);
    const views = await Promise.all(rows.map((row) => this.toView(row)));
    return toPaginated(views, total, filter.page, filter.pageSize);
  }

  async get(id: string): Promise<ReversalResponseDto> {
    return this.toView(await this.findOrThrow(id));
  }

  /** Shared pre-conditions for approve/reject, including the hard SoD rule. */
  private async pendingForDecision(
    id: string,
    deciderId: string,
    client: PrismaService | TransactionClient = this.prisma,
  ): Promise<ReversalWithPayment> {
    const reversal = await this.findOrThrow(id, client);
    if (isDecided(reversal.status)) {
      throw new AppException(
        ErrorCode.REVERSAL_ALREADY_DECIDED,
        REVERSALS_MESSAGES.ALREADY_DECIDED,
        HttpStatus.CONFLICT,
        { id },
      );
    }
    if (violatesSegregation(reversal.capturedById, deciderId)) {
      this.logger.warn({
        msg: 'sod: capturer attempted to decide own reversal',
        reversalId: id,
        userId: deciderId,
      });
      throw new AppException(
        ErrorCode.SOD_VIOLATION,
        REVERSALS_MESSAGES.SOD,
        HttpStatus.FORBIDDEN,
        { reversalId: id },
      );
    }
    return reversal;
  }

  private async lockForUpdate(tx: TransactionClient, id: string): Promise<void> {
    await tx.$queryRaw`SELECT id FROM reversal WHERE id = ${id}::uuid FOR UPDATE`;
  }

  private async findOrThrow(
    id: string,
    client: PrismaService | TransactionClient = this.prisma,
  ): Promise<ReversalWithPayment> {
    const row = await client.reversal.findUnique({ where: { id }, include: REVERSAL_INCLUDE });
    if (row === null) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        REVERSALS_MESSAGES.NOT_FOUND,
        HttpStatus.NOT_FOUND,
        { id },
      );
    }
    return row;
  }

  private async toView(row: ReversalWithPayment): Promise<ReversalResponseDto> {
    const capturer = await this.prisma.user.findUnique({
      where: { id: row.capturedById },
      select: { email: true },
    });
    return {
      id: row.id,
      payment: toPaymentView(row.payment),
      reason: row.reason,
      capturedById: row.capturedById,
      capturedByEmail: capturer?.email ?? null,
      status: row.status,
      approvedById: row.approvedById,
      decidedAt: row.decidedAt,
      decisionNote: row.decisionNote,
      createdAt: row.createdAt,
    };
  }
}
