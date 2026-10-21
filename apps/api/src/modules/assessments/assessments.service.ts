import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { addDays } from 'date-fns';

import { AssessmentStatus, ErrorCode, type Paginated } from '@ircub/shared';

import { csvLine } from '../../common/csv/csv.rules';
import { AppException } from '../../common/errors/app.exception';
import { normaliseControlNumber } from '../../common/ids/ids.rules';
import { IdsService } from '../../common/ids/ids.service';
import { toDecimal } from '../../common/money/money.rules';
import { parseSort, toPageSlice, toPaginated } from '../../common/pagination/pagination.rules';
import { PrismaService } from '../../prisma/prisma.service';
import { PayersService } from '../payers/payers.service';
import { PAYMENT_INCLUDE, toPaymentView } from '../payments/payments.view';
import { RevenueTypesService } from '../revenue-types/revenue-types.service';
import { SystemConfigKey } from '../system-config/system-config.keys';
import { SystemConfigService } from '../system-config/system-config.service';

import { ASSESSMENTS_API } from './assessments.constants';
import { ASSESSMENTS_MESSAGES } from './assessments.messages';
import {
  applyPayment,
  computeAssessmentAmount,
  isPayable,
  reversePayment,
} from './assessments.rules';
import { ASSESSMENT_INCLUDE, outstandingOf, toAssessmentView } from './assessments.view';

import type { AssessmentWithRelations } from './assessments.types';
import type { AssessmentDetailResponseDto } from './dto/assessment-detail.response.dto';
import type { AssessmentFilterDto } from './dto/assessment-filter.dto';
import type { AssessmentResponseDto } from './dto/assessment.response.dto';
import type { CreateAssessmentDto } from './dto/create-assessment.dto';
import type { TransactionClient } from '../../prisma/prisma.types';
import type { Assessment, Prisma } from '@prisma/client';
import type { Decimal } from 'decimal.js';

/** Assessments with control numbers, advanced filters and the payment ledger (brief Module 3). */
@Injectable()
export class AssessmentsService {
  private readonly logger = new Logger(AssessmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdsService,
    private readonly payers: PayersService,
    private readonly revenueTypes: RevenueTypesService,
    private readonly systemConfig: SystemConfigService,
  ) {}

  async create(dto: CreateAssessmentDto, actorId: string): Promise<AssessmentResponseDto> {
    const [payer, revenueType, localCurrency, defaultDueDays] = await Promise.all([
      this.payers.assertActive(dto.payerId),
      this.revenueTypes.getActiveOrThrow(dto.revenueTypeId),
      this.systemConfig.get(SystemConfigKey.LOCAL_CURRENCY),
      this.systemConfig.get(SystemConfigKey.ASSESSMENT_DEFAULT_DUE_DAYS),
    ]);
    const amount = computeAssessmentAmount(
      revenueType.rateType,
      revenueType.rate,
      dto.baseAmount ?? null,
    );
    if (amount === null) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        ASSESSMENTS_MESSAGES.BASE_AMOUNT_REQUIRED,
        HttpStatus.BAD_REQUEST,
        {
          revenueTypeId: revenueType.id,
        },
      );
    }
    // Control number comes from the shared sequence inside the same transaction (D10).
    const created = await this.prisma.$transaction(async (tx) => {
      const controlNumber = await this.ids.nextControlNumber(tx, 'ASSESSMENT');
      return tx.assessment.create({
        data: {
          controlNumber,
          payerId: payer.id,
          revenueTypeId: revenueType.id,
          period: dto.period ?? null,
          baseAmount: dto.baseAmount ?? null,
          amount: amount.toFixed(),
          currency: localCurrency,
          dueDate: dto.dueDate ?? addDays(new Date(), defaultDueDays),
          createdById: actorId,
          notes: dto.notes ?? null,
        },
        include: ASSESSMENT_INCLUDE,
      });
    });
    this.logger.log({
      msg: 'assessment created',
      assessmentId: created.id,
      controlNumber: created.controlNumber,
      amount: created.amount,
    });
    return toAssessmentView(created);
  }

  async list(filter: AssessmentFilterDto): Promise<Paginated<AssessmentResponseDto>> {
    const where = this.whereFor(filter);
    const sort = parseSort(filter.sort, ASSESSMENTS_API.SORTABLE, {
      field: 'createdAt',
      direction: 'desc',
    });
    const { skip, take } = toPageSlice(filter.page, filter.pageSize);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.assessment.findMany({
        where,
        skip,
        take,
        orderBy: { [sort.field]: sort.direction },
        include: ASSESSMENT_INCLUDE,
      }),
      this.prisma.assessment.count({ where }),
    ]);
    return toPaginated(rows.map(toAssessmentView), total, filter.page, filter.pageSize);
  }

  /** Same filters as the list, rendered as CSV (brief Module 3.5). */
  async exportCsv(filter: AssessmentFilterDto): Promise<string> {
    const rows = await this.prisma.assessment.findMany({
      where: this.whereFor(filter),
      orderBy: { createdAt: 'desc' },
      take: ASSESSMENTS_API.EXPORT_MAX_ROWS,
      include: ASSESSMENT_INCLUDE,
    });
    const lines = rows.map((row) =>
      csvLine([
        row.controlNumber,
        row.payer.tin,
        row.payer.name,
        row.revenueType.code,
        row.period,
        row.baseAmount?.toFixed(),
        row.amount.toFixed(),
        row.paidAmount.toFixed(),
        outstandingOf(row.amount, row.paidAmount).toFixed(),
        row.currency,
        row.status,
        row.dueDate.toISOString(),
        row.createdAt.toISOString(),
      ]),
    );
    return [csvLine(ASSESSMENTS_API.EXPORT_COLUMNS), ...lines].join('\n') + '\n';
  }

  async get(id: string): Promise<AssessmentDetailResponseDto> {
    const row = await this.findOrThrow(id);
    const payments = await this.prisma.payment.findMany({
      where: { assessmentId: id },
      include: PAYMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return Object.assign(toAssessmentView(row), { payments: payments.map(toPaymentView) });
  }

  async cancel(id: string): Promise<AssessmentResponseDto> {
    const row = await this.findOrThrow(id);
    if (!toDecimal(row.paidAmount).isZero() || row.status === AssessmentStatus.CANCELLED) {
      throw new AppException(
        ErrorCode.ASSESSMENT_NOT_PAYABLE,
        ASSESSMENTS_MESSAGES.CANNOT_CANCEL_PAID,
        HttpStatus.CONFLICT,
        { id },
      );
    }
    const updated = await this.prisma.assessment.update({
      where: { id },
      data: { status: AssessmentStatus.CANCELLED },
      include: ASSESSMENT_INCLUDE,
    });
    this.logger.log({ msg: 'assessment cancelled', assessmentId: id });
    return toAssessmentView(updated);
  }

  async findByControlNumber(controlNumber: string): Promise<AssessmentWithRelations | null> {
    return this.prisma.assessment.findUnique({
      where: { controlNumber: normaliseControlNumber(controlNumber) },
      include: ASSESSMENT_INCLUDE,
    });
  }

  /**
   * Applies a confirmed payment's local amount inside the caller's transaction. The row is
   * locked FOR UPDATE so two concurrent captures cannot both see the same outstanding balance.
   */
  async applyPayment(
    tx: TransactionClient,
    assessmentId: string,
    localAmount: Decimal,
  ): Promise<Assessment> {
    const current = await this.lockForUpdate(tx, assessmentId);
    if (!isPayable(current.status)) {
      throw new AppException(
        ErrorCode.ASSESSMENT_NOT_PAYABLE,
        ASSESSMENTS_MESSAGES.NOT_PAYABLE,
        HttpStatus.CONFLICT,
        {
          assessmentId,
          status: current.status,
        },
      );
    }
    const result = applyPayment(
      {
        amount: toDecimal(current.amount),
        paidAmount: toDecimal(current.paidAmount),
        status: current.status,
      },
      localAmount,
    );
    if (!result.ok) {
      throw new AppException(
        ErrorCode.OVERPAYMENT,
        ASSESSMENTS_MESSAGES.OVERPAYMENT,
        HttpStatus.UNPROCESSABLE_ENTITY,
        {
          assessmentId,
          outstanding: result.outstanding.toFixed(),
          attempted: localAmount.toFixed(),
        },
      );
    }
    return tx.assessment.update({
      where: { id: assessmentId },
      data: { paidAmount: result.paidAmount.toFixed(), status: result.status },
    });
  }

  /** Reversal approval: subtract the payment and recompute status, inside the caller's transaction. */
  async reversePayment(
    tx: TransactionClient,
    assessmentId: string,
    localAmount: Decimal,
  ): Promise<Assessment> {
    const current = await this.lockForUpdate(tx, assessmentId);
    const next = reversePayment(
      {
        amount: toDecimal(current.amount),
        paidAmount: toDecimal(current.paidAmount),
        status: current.status,
      },
      localAmount,
    );
    return tx.assessment.update({
      where: { id: assessmentId },
      data: { paidAmount: next.paidAmount.toFixed(), status: next.status },
    });
  }

  private async lockForUpdate(tx: TransactionClient, id: string): Promise<Assessment> {
    await tx.$queryRaw`SELECT id FROM assessment WHERE id = ${id}::uuid FOR UPDATE`;
    const row = await tx.assessment.findUnique({ where: { id } });
    if (row === null) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        ASSESSMENTS_MESSAGES.NOT_FOUND,
        HttpStatus.NOT_FOUND,
        { id },
      );
    }
    return row;
  }

  private whereFor(filter: AssessmentFilterDto): Prisma.AssessmentWhereInput {
    return {
      ...(filter.payerId === undefined ? {} : { payerId: filter.payerId }),
      ...(filter.tin === undefined ? {} : { payer: { tin: filter.tin.trim().toUpperCase() } }),
      ...(filter.revenueTypeId === undefined ? {} : { revenueTypeId: filter.revenueTypeId }),
      ...(filter.status === undefined ? {} : { status: filter.status }),
      ...(filter.controlNumber === undefined
        ? {}
        : { controlNumber: normaliseControlNumber(filter.controlNumber) }),
      ...(filter.amountMin === undefined && filter.amountMax === undefined
        ? {}
        : {
            amount: {
              ...(filter.amountMin === undefined ? {} : { gte: filter.amountMin }),
              ...(filter.amountMax === undefined ? {} : { lte: filter.amountMax }),
            },
          }),
      ...(filter.dateFrom === undefined && filter.dateTo === undefined
        ? {}
        : {
            createdAt: {
              ...(filter.dateFrom === undefined ? {} : { gte: filter.dateFrom }),
              ...(filter.dateTo === undefined ? {} : { lte: filter.dateTo }),
            },
          }),
      ...(filter.dueFrom === undefined && filter.dueTo === undefined
        ? {}
        : {
            dueDate: {
              ...(filter.dueFrom === undefined ? {} : { gte: filter.dueFrom }),
              ...(filter.dueTo === undefined ? {} : { lte: filter.dueTo }),
            },
          }),
    };
  }

  private async findOrThrow(id: string): Promise<AssessmentWithRelations> {
    const row = await this.prisma.assessment.findUnique({
      where: { id },
      include: ASSESSMENT_INCLUDE,
    });
    if (row === null) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        ASSESSMENTS_MESSAGES.NOT_FOUND,
        HttpStatus.NOT_FOUND,
        { id },
      );
    }
    return row;
  }
}
