import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { ErrorCode } from '@ircub/shared';

import { CsvImportService } from '../../common/csv/csv-import.service';
import { templateCsv } from '../../common/csv/csv.rules';
import { AppException } from '../../common/errors/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { SystemConfigKey } from '../system-config/system-config.keys';
import { SystemConfigService } from '../system-config/system-config.service';

import { REVENUE_TARGETS_TEMPLATE, TARGET_COLUMN, TARGET_REASON } from './dashboard.constants';
import { DASHBOARD_MESSAGES } from './dashboard.messages';
import { periodsBetween } from './dashboard.rules';
import { type RevenueTargetRow, revenueTargetRowSchema } from './targets.schema';

import type { RevenueTargetWithType, TargetsImportContext } from './dashboard.types';
import type { RevenueTargetResponseDto } from './dto/revenue-target.response.dto';
import type { UpsertTargetDto } from './dto/upsert-target.dto';
import type { AcceptedRow, RowOutcome } from '../../common/csv/csv.types';
import type { TransactionClient } from '../../prisma/prisma.types';
import type { CsvSummaryResponseDto } from '../bulk-uploads/dto/csv-summary.response.dto';

const TARGET_INCLUDE = { revenueType: { select: { code: true, name: true } } } as const;

/** Monthly revenue targets per revenue type: table edits and CSV import through the shared pipeline (D12). */
@Injectable()
export class TargetsService {
  private readonly logger = new Logger(TargetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly csv: CsvImportService,
    private readonly systemConfig: SystemConfigService,
  ) {}

  async list(from: string, to: string): Promise<RevenueTargetResponseDto[]> {
    const rows = await this.prisma.revenueTarget.findMany({
      where: { period: { in: periodsBetween(from, to) } },
      orderBy: [{ period: 'asc' }, { revenueType: { code: 'asc' } }],
      include: TARGET_INCLUDE,
    });
    return rows.map(toTargetView);
  }

  async upsert(dto: UpsertTargetDto, actorId: string): Promise<RevenueTargetResponseDto> {
    const type = await this.prisma.revenueType.findUnique({ where: { id: dto.revenueTypeId } });
    if (type === null) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        DASHBOARD_MESSAGES.REVENUE_TYPE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    const row = await this.prisma.revenueTarget.upsert({
      where: { period_revenueTypeId: { period: dto.period, revenueTypeId: dto.revenueTypeId } },
      update: { amount: dto.amount },
      create: {
        period: dto.period,
        revenueTypeId: dto.revenueTypeId,
        amount: dto.amount,
        createdById: actorId,
      },
      include: TARGET_INCLUDE,
    });
    this.logger.log({
      msg: 'revenue target set',
      period: dto.period,
      revenueTypeId: dto.revenueTypeId,
      amount: dto.amount,
    });
    return toTargetView(row);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.revenueTarget.findUnique({ where: { id } });
    if (existing === null) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        DASHBOARD_MESSAGES.TARGET_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        { id },
      );
    }
    await this.prisma.revenueTarget.delete({ where: { id } });
  }

  template(): string {
    return templateCsv(REVENUE_TARGETS_TEMPLATE.columns);
  }

  async import(content: Buffer, dryRun: boolean, actorId: string): Promise<CsvSummaryResponseDto> {
    const maxRows = await this.systemConfig.get(SystemConfigKey.CSV_MAX_ROWS);
    const result = await this.csv.run<RevenueTargetRow, TargetsImportContext>({
      content,
      expectedColumns: REVENUE_TARGETS_TEMPLATE.columns,
      schema: revenueTargetRowSchema,
      maxRows,
      dryRun,
      createContext: async () => {
        const types = await this.prisma.revenueType.findMany({ select: { id: true, code: true } });
        return { typeIdByCode: new Map(types.map((t) => [t.code, t.id])), seen: new Set<string>() };
      },
      validateRow: (row, _rowNumber, context) => Promise.resolve(this.validateRow(row, context)),
      persist: (accepted, _summary, context, tx) => this.persist(accepted, context, tx, actorId),
    });
    return { ...result.summary, rejected: [...result.summary.rejected] };
  }

  private validateRow(row: RevenueTargetRow, context: TargetsImportContext): RowOutcome {
    if (!context.typeIdByCode.has(row.revenue_type_code)) {
      return {
        ok: false,
        field: TARGET_COLUMN.REVENUE_TYPE_CODE,
        reason: TARGET_REASON.UNKNOWN_REVENUE_TYPE,
        message: DASHBOARD_MESSAGES.UNKNOWN_REVENUE_TYPE,
      };
    }
    const key = `${row.period}|${row.revenue_type_code}`;
    if (context.seen.has(key)) {
      return {
        ok: false,
        field: TARGET_COLUMN.PERIOD,
        reason: TARGET_REASON.DUPLICATE_IN_FILE,
        message: DASHBOARD_MESSAGES.DUPLICATE_IN_FILE,
      };
    }
    context.seen.add(key);
    return { ok: true };
  }

  private async persist(
    accepted: readonly AcceptedRow<RevenueTargetRow>[],
    context: TargetsImportContext,
    tx: TransactionClient,
    actorId: string,
  ): Promise<undefined> {
    for (const { data } of accepted) {
      const revenueTypeId = context.typeIdByCode.get(data.revenue_type_code);
      if (revenueTypeId === undefined) {
        continue;
      }
      await tx.revenueTarget.upsert({
        where: { period_revenueTypeId: { period: data.period, revenueTypeId } },
        update: { amount: data.amount },
        create: { period: data.period, revenueTypeId, amount: data.amount, createdById: actorId },
      });
    }
    this.logger.log({ msg: 'revenue targets imported', rows: accepted.length });
    return undefined;
  }
}

export function toTargetView(row: RevenueTargetWithType): RevenueTargetResponseDto {
  return {
    id: row.id,
    period: row.period,
    revenueTypeId: row.revenueTypeId,
    revenueType: row.revenueType,
    amount: row.amount.toFixed(),
  };
}
