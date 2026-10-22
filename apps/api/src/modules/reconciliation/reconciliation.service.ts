import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import {
  Currency,
  ErrorCode,
  type Paginated,
  type PaymentChannel,
  PaymentStatus,
  ReconciliationRunStatus,
} from '@ircub/shared';

import { csvLine } from '../../common/csv/csv.rules';
import { AppException } from '../../common/errors/app.exception';
import { parseSort, toPageSlice, toPaginated } from '../../common/pagination/pagination.rules';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { parseStatementCsv } from '../channels/channels.rules';
import { ChannelsService } from '../channels/channels.service';

import { RECONCILIATION_API } from './reconciliation.constants';
import { RECONCILIATION_MESSAGES } from './reconciliation.messages';
import { classify, previousUtcDay, utcDayBounds } from './reconciliation.rules';
import { LINE_INCLUDE, RUN_INCLUDE, toLineView, toRunView } from './reconciliation.view';

import type { ChannelStatementResponseDto } from './dto/channel-statement.response.dto';
import type { ReconciliationLineFilterDto } from './dto/reconciliation-line-filter.dto';
import type { ReconciliationLineResponseDto } from './dto/reconciliation-line.response.dto';
import type { ReconciliationRunDetailResponseDto } from './dto/reconciliation-run-detail.response.dto';
import type { ReconciliationRunFilterDto } from './dto/reconciliation-run-filter.dto';
import type { ReconciliationRunResponseDto } from './dto/reconciliation-run.response.dto';
import type { LedgerEntry, StatementEntry } from './reconciliation.types';
import type { ChannelStatement, Prisma } from '@prisma/client';

/**
 * Channel reconciliation (brief Module 5.3; D16). A run fetches (or receives) the channel's
 * statement for one UTC day, stores it verbatim for audit, matches every line against the
 * CONFIRMED/REVERSED payments of that channel and day on `channelTxnRef`, and persists the
 * classified lines (`reconciliation.rules.ts`).
 */
@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly channels: ChannelsService,
    private readonly config: AppConfigService,
  ) {}

  /** Daily at 01:00 for yesterday, every online channel. */
  @Cron(RECONCILIATION_API.DAILY_CRON)
  async runDaily(): Promise<void> {
    const date = previousUtcDay(new Date());
    for (const channel of this.channels.onlineChannels()) {
      await this.runForChannel(channel, date, false, null);
    }
  }

  async runForChannel(
    channel: PaymentChannel,
    date: string,
    perturb: boolean,
    actorId: string | null,
  ): Promise<ReconciliationRunResponseDto> {
    let statement: ChannelStatement;
    try {
      const csv = await this.channels.clientFor(channel).statement(date, perturb);
      statement = await this.storeStatement(
        channel,
        date,
        RECONCILIATION_API.FETCHED_FILE_NAME(channel, date),
        csv,
        actorId,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn({ msg: 'statement fetch failed', channel, date, error: message });
      const failed = await this.prisma.reconciliationRun.create({
        data: {
          channel,
          runDate: new Date(date),
          status: ReconciliationRunStatus.FAILED,
          runById: actorId,
          error: message,
        },
        include: RUN_INCLUDE,
      });
      return toRunView(failed);
    }
    return this.runForStatement(statement, actorId);
  }

  /** Manual "statement file" path: parse, store, then reconcile exactly like a fetched one. */
  async importStatement(
    channel: PaymentChannel,
    date: string,
    fileName: string,
    content: string,
    actorId: string,
  ): Promise<ReconciliationRunResponseDto> {
    const statement = await this.storeStatement(channel, date, fileName, content, actorId);
    return this.runForStatement(statement, actorId);
  }

  async listStatements(): Promise<ChannelStatementResponseDto[]> {
    const rows = await this.prisma.channelStatement.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        channel: true,
        statementDate: true,
        fileName: true,
        lineCount: true,
        createdAt: true,
      },
    });
    return rows;
  }

  async listRuns(
    filter: ReconciliationRunFilterDto,
  ): Promise<Paginated<ReconciliationRunResponseDto>> {
    const where: Prisma.ReconciliationRunWhereInput = {
      ...(filter.channel === undefined ? {} : { channel: filter.channel }),
      ...(filter.status === undefined ? {} : { status: filter.status }),
      ...(filter.dateFrom === undefined && filter.dateTo === undefined
        ? {}
        : {
            runDate: {
              ...(filter.dateFrom === undefined ? {} : { gte: new Date(filter.dateFrom) }),
              ...(filter.dateTo === undefined ? {} : { lte: new Date(filter.dateTo) }),
            },
          }),
    };
    const sort = parseSort(filter.sort, RECONCILIATION_API.SORTABLE, {
      field: 'createdAt',
      direction: 'desc',
    });
    const { skip, take } = toPageSlice(filter.page, filter.pageSize);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.reconciliationRun.findMany({
        where,
        skip,
        take,
        orderBy: { [sort.field]: sort.direction },
        include: RUN_INCLUDE,
      }),
      this.prisma.reconciliationRun.count({ where }),
    ]);
    return toPaginated(rows.map(toRunView), total, filter.page, filter.pageSize);
  }

  async getRun(
    id: string,
    filter: ReconciliationLineFilterDto,
  ): Promise<ReconciliationRunDetailResponseDto> {
    const run = await this.findRunOrThrow(id);
    return Object.assign(toRunView(run), { lines: await this.lines(id, filter) });
  }

  async exportCsv(id: string): Promise<string> {
    await this.findRunOrThrow(id);
    const lines = await this.lines(id, {});
    const rows = lines.map((line) =>
      csvLine([
        line.status,
        line.txnRef,
        line.controlNumber,
        line.ircubAmount,
        line.channelAmount,
        line.currency,
        line.note,
      ]),
    );
    return `${[csvLine(RECONCILIATION_API.EXPORT_COLUMNS), ...rows].join('\n')}\n`;
  }

  private async lines(
    runId: string,
    filter: ReconciliationLineFilterDto,
  ): Promise<ReconciliationLineResponseDto[]> {
    const rows = await this.prisma.reconciliationLine.findMany({
      where: { runId, ...(filter.status === undefined ? {} : { status: filter.status }) },
      orderBy: [{ status: 'asc' }, { txnRef: 'asc' }],
      include: LINE_INCLUDE,
    });
    return rows.map(toLineView);
  }

  private async runForStatement(
    statement: ChannelStatement,
    actorId: string | null,
  ): Promise<ReconciliationRunResponseDto> {
    const date = statement.statementDate.toISOString().slice(0, 'YYYY-MM-DD'.length);
    const { start, end } = utcDayBounds(date);
    const [payments, statementLines] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          channel: statement.channel,
          status: { in: [PaymentStatus.CONFIRMED, PaymentStatus.REVERSED] },
          channelTxnRef: { not: null },
          paidAt: { gte: start, lt: end },
        },
        select: {
          id: true,
          channelTxnRef: true,
          controlNumber: true,
          amount: true,
          currency: true,
        },
      }),
      this.prisma.channelStatementLine.findMany({ where: { statementId: statement.id } }),
    ]);
    const ledger: LedgerEntry[] = payments.map((p) => ({
      paymentId: p.id,
      txnRef: p.channelTxnRef ?? '',
      controlNumber: p.controlNumber,
      amount: p.amount,
      currency: p.currency,
    }));
    const channelSide: StatementEntry[] = statementLines.map((l) => ({
      statementLineId: l.id,
      txnRef: l.txnRef,
      controlNumber: l.controlNumber,
      amount: l.amount,
      currency: l.currency,
    }));
    const { lines, summary } = classify(ledger, channelSide);
    const run = await this.prisma.$transaction(async (tx) => {
      const created = await tx.reconciliationRun.create({
        data: {
          channel: statement.channel,
          runDate: statement.statementDate,
          statementId: statement.id,
          status: ReconciliationRunStatus.COMPLETED,
          runById: actorId,
          matched: summary.matched,
          missingInIrcub: summary.missingInIrcub,
          missingInChannel: summary.missingInChannel,
          amountMismatch: summary.amountMismatch,
        },
        include: RUN_INCLUDE,
      });
      if (lines.length > 0) {
        await tx.reconciliationLine.createMany({
          data: lines.map((line) => ({ ...line, runId: created.id })),
        });
      }
      return created;
    });
    this.logger.log({
      msg: 'reconciliation run completed',
      runId: run.id,
      channel: run.channel,
      date,
      matched: summary.matched,
      missingInIrcub: summary.missingInIrcub,
      missingInChannel: summary.missingInChannel,
      amountMismatch: summary.amountMismatch,
    });
    return toRunView(run);
  }

  private async storeStatement(
    channel: PaymentChannel,
    date: string,
    fileName: string,
    content: string,
    actorId: string | null,
  ): Promise<ChannelStatement> {
    let records: ReturnType<typeof parseStatementCsv>;
    try {
      records = parseStatementCsv(content);
    } catch (error: unknown) {
      throw new AppException(
        ErrorCode.STATEMENT_INVALID,
        RECONCILIATION_MESSAGES.STATEMENT_INVALID,
        HttpStatus.UNPROCESSABLE_ENTITY,
        {
          reason: error instanceof Error ? error.message : String(error),
        },
      );
    }
    const invalid = records.find((r) => !Object.values(Currency).includes(r.currency as Currency));
    if (invalid !== undefined) {
      throw new AppException(
        ErrorCode.STATEMENT_INVALID,
        RECONCILIATION_MESSAGES.STATEMENT_INVALID,
        HttpStatus.UNPROCESSABLE_ENTITY,
        {
          txnRef: invalid.txnRef,
          currency: invalid.currency,
        },
      );
    }
    const statement = await this.prisma.$transaction(async (tx) => {
      const created = await tx.channelStatement.create({
        data: {
          channel,
          statementDate: new Date(date),
          fileName,
          storedPath: '',
          lineCount: records.length,
          importedById: actorId,
        },
      });
      const storedPath = join(RECONCILIATION_API.STATEMENT_DIR, `${created.id}.csv`);
      if (records.length > 0) {
        await tx.channelStatementLine.createMany({
          data: records.map((r) => ({
            statementId: created.id,
            txnRef: r.txnRef,
            date: new Date(r.date),
            amount: r.amount,
            currency: r.currency as Currency,
            controlNumber: r.controlNumber,
            status: r.status,
          })),
        });
      }
      return tx.channelStatement.update({ where: { id: created.id }, data: { storedPath } });
    });
    const absolute = join(this.config.storageDir, statement.storedPath);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, content, 'utf8');
    return statement;
  }

  private async findRunOrThrow(id: string) {
    const run = await this.prisma.reconciliationRun.findUnique({
      where: { id },
      include: RUN_INCLUDE,
    });
    if (run === null) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        RECONCILIATION_MESSAGES.RUN_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        { id },
      );
    }
    return run;
  }
}
