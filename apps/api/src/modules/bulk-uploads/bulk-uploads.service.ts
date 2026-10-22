import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Decimal } from 'decimal.js';

import {
  BulkUploadKind,
  type Currency,
  ErrorCode,
  type Paginated,
  PaymentChannel,
  UserStatus,
} from '@ircub/shared';

import { CsvImportService } from '../../common/csv/csv-import.service';
import { CSV_IMPORT } from '../../common/csv/csv.constants';
import { templateCsv } from '../../common/csv/csv.rules';
import { AppException } from '../../common/errors/app.exception';
import { normaliseControlNumber } from '../../common/ids/ids.rules';
import { toDecimal } from '../../common/money/money.rules';
import { toPageSlice, toPaginated } from '../../common/pagination/pagination.rules';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { outstandingOf } from '../assessments/assessments.rules';
import { SummaryService } from '../dashboard/summary.service';
import { FxService } from '../fx/fx.service';
import { PaymentsService } from '../payments/payments.service';
import { SystemConfigKey } from '../system-config/system-config.keys';
import { SystemConfigService } from '../system-config/system-config.service';

import { BULK_COLUMN, REVENUE_TRANSACTIONS_TEMPLATE } from './bulk-uploads.constants';
import { BULK_MESSAGES } from './bulk-uploads.messages';
import { storedFileName, txnRefKey, validateRevenueRow } from './bulk-uploads.rules';
import { type RevenueTransactionRow, revenueTransactionRowSchema } from './bulk-uploads.schema';

import type {
  AssessmentLookupEntry,
  BulkUploadRow,
  RevenueImportContext,
} from './bulk-uploads.types';
import type { BulkUploadFilterDto } from './dto/bulk-upload-filter.dto';
import type { BulkUploadResponseDto } from './dto/bulk-upload.response.dto';
import type { CsvSummaryResponseDto } from './dto/csv-summary.response.dto';
import type { AcceptedRow, CsvImportSummary, CsvRecord } from '../../common/csv/csv.types';
import type { TransactionClient } from '../../prisma/prisma.types';
import type { Prisma } from '@prisma/client';

/**
 * Bulk revenue-transaction importer (brief Module 3.3) on the shared CSV pipeline (D12).
 * Every row is validated against the schema and the ledger; accepted rows become CONFIRMED
 * payments through the same code path as manual capture; rejected rows are reported
 * individually with line, field and reason.
 */
@Injectable()
export class BulkUploadsService {
  private readonly logger = new Logger(BulkUploadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly csv: CsvImportService,
    private readonly payments: PaymentsService,
    private readonly fx: FxService,
    private readonly systemConfig: SystemConfigService,
    private readonly config: AppConfigService,
    private readonly summaries: SummaryService,
  ) {}

  template(): string {
    return templateCsv([
      ...REVENUE_TRANSACTIONS_TEMPLATE.columns,
      ...REVENUE_TRANSACTIONS_TEMPLATE.optionalColumns,
    ]);
  }

  async importRevenueTransactions(
    content: Buffer,
    fileName: string,
    dryRun: boolean,
    uploaderId: string,
  ): Promise<CsvSummaryResponseDto> {
    const maxRows = await this.systemConfig.get(SystemConfigKey.CSV_MAX_ROWS);
    const uploadId = randomUUID();
    const storedPath = join(CSV_IMPORT.UPLOAD_DIR, storedFileName(uploadId));

    const result = await this.csv.run<RevenueTransactionRow, RevenueImportContext>({
      content,
      expectedColumns: REVENUE_TRANSACTIONS_TEMPLATE.columns,
      schema: revenueTransactionRowSchema,
      maxRows,
      dryRun,
      createContext: (records) => this.buildContext(records, uploaderId, fileName, storedPath),
      validateRow: (row, _rowNumber, context) => Promise.resolve(validateRevenueRow(row, context)),
      persist: (accepted, summary, context, tx) =>
        this.persist(uploadId, accepted, summary, context, tx),
    });

    if (!dryRun) {
      await this.storeFile(storedPath, content);
    }
    return { ...result.summary, rejected: [...result.summary.rejected] };
  }

  async list(filter: BulkUploadFilterDto): Promise<Paginated<BulkUploadResponseDto>> {
    const where: Prisma.BulkUploadWhereInput =
      filter.kind === undefined ? {} : { kind: filter.kind };
    const { skip, take } = toPageSlice(filter.page, filter.pageSize);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.bulkUpload.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      this.prisma.bulkUpload.count({ where }),
    ]);
    return toPaginated(
      rows.map((row) => toView(row, false)),
      total,
      filter.page,
      filter.pageSize,
    );
  }

  async get(id: string): Promise<BulkUploadResponseDto> {
    const row = await this.prisma.bulkUpload.findUnique({ where: { id } });
    if (row === null) {
      throw new AppException(ErrorCode.NOT_FOUND, BULK_MESSAGES.NOT_FOUND, HttpStatus.NOT_FOUND, {
        id,
      });
    }
    return toView(row, true);
  }

  /**
   * One pass over the parsed records to prefetch every assessment, existing reference and
   * capturer. Records are header-keyed, so column order and quoting in the file do not matter.
   */
  private async buildContext(
    records: readonly CsvRecord[],
    uploaderId: string,
    fileName: string,
    storedPath: string,
  ): Promise<RevenueImportContext> {
    const controlNumbers = new Set<string>();
    const refs: { channel: PaymentChannel; ref: string }[] = [];
    const emails = new Set<string>();
    const currencies = new Set<Currency>();
    for (const record of records) {
      const controlNumber = record[BULK_COLUMN.CONTROL_NUMBER];
      const currency = record[BULK_COLUMN.CURRENCY];
      const channel = record[BULK_COLUMN.CHANNEL];
      const ref = record[BULK_COLUMN.CHANNEL_TXN_REF];
      const email = record[BULK_COLUMN.CAPTURED_BY_EMAIL];
      if (controlNumber !== undefined && controlNumber.length > 0) {
        controlNumbers.add(normaliseControlNumber(controlNumber));
      }
      if (
        ref !== undefined &&
        ref.length > 0 &&
        channel !== undefined &&
        (Object.values(PaymentChannel) as string[]).includes(channel)
      ) {
        refs.push({ channel: channel as PaymentChannel, ref });
      }
      if (email !== undefined && email.length > 0) {
        emails.add(email.toLowerCase());
      }
      if (currency !== undefined && currency.length > 0) {
        currencies.add(currency as Currency);
      }
    }

    const localCurrency = await this.systemConfig.get(SystemConfigKey.LOCAL_CURRENCY);
    const [assessments, existing, users] = await Promise.all([
      this.prisma.assessment.findMany({
        where: { controlNumber: { in: [...controlNumbers] } },
        select: {
          id: true,
          payerId: true,
          controlNumber: true,
          status: true,
          amount: true,
          paidAmount: true,
        },
      }),
      refs.length === 0
        ? Promise.resolve([])
        : this.prisma.payment.findMany({
            where: { OR: refs.map((r) => ({ channel: r.channel, channelTxnRef: r.ref })) },
            select: { channel: true, channelTxnRef: true },
          }),
      emails.size === 0
        ? Promise.resolve([])
        : this.prisma.user.findMany({
            where: { email: { in: [...emails] }, status: UserStatus.ACTIVE },
            select: { id: true, email: true },
          }),
    ]);
    const rates = new Map<Currency, Decimal>();
    for (const currency of currencies) {
      if (currency === localCurrency) {
        continue;
      }
      try {
        rates.set(currency, (await this.fx.latestRate(currency, localCurrency)).rate);
      } catch {
        // Rows in this currency are rejected individually with FX_RATE_UNAVAILABLE.
      }
    }
    return {
      assessments: new Map(
        assessments.map((a): [string, AssessmentLookupEntry] => [
          a.controlNumber,
          {
            id: a.id,
            payerId: a.payerId,
            controlNumber: a.controlNumber,
            status: a.status,
            outstanding: outstandingOf(a.amount, a.paidAmount),
          },
        ]),
      ),
      existingTxnRefs: new Set(existing.map((p) => txnRefKey(p.channel, p.channelTxnRef ?? ''))),
      seenTxnRefs: new Set(),
      usersByEmail: new Map(users.map((u) => [u.email, u.id])),
      rates,
      localCurrency,
      uploaderId,
      fileName,
      storedPath,
    };
  }

  private async persist(
    uploadId: string,
    accepted: readonly AcceptedRow<RevenueTransactionRow>[],
    summary: CsvImportSummary,
    context: RevenueImportContext,
    tx: TransactionClient,
  ): Promise<string> {
    const upload = await tx.bulkUpload.create({
      data: {
        id: uploadId,
        kind: BulkUploadKind.REVENUE_TRANSACTIONS,
        fileName: context.fileName,
        storedPath: context.storedPath,
        totalRows: summary.totalRows,
        accepted: summary.accepted,
        rejected: summary.rejected.length,
        summary: { ...summary, uploadId } as unknown as Prisma.InputJsonValue,
        uploadedById: context.uploaderId,
      },
    });
    for (const { data } of accepted) {
      const controlNumber = normaliseControlNumber(data.control_number);
      const assessment = context.assessments.get(controlNumber);
      if (assessment === undefined) {
        continue; // validated earlier; defensive
      }
      // Imported payments are often back-dated: the dashboard summaries of each paid day are
      // rebuilt once the import commits (debounced), like every other payment path.
      this.summaries.markDirty(data.paid_at);
      await this.payments.recordConfirmedPayment(tx, {
        assessmentId: assessment.id,
        billId: null,
        payerId: assessment.payerId,
        controlNumber,
        channel: data.channel,
        channelTxnRef: data.channel_txn_ref,
        amount: toDecimal(data.amount),
        currency: data.currency,
        paidAt: data.paid_at,
        capturedById:
          data.captured_by_email === null
            ? context.uploaderId
            : (context.usersByEmail.get(data.captured_by_email.toLowerCase()) ??
              context.uploaderId),
        bulkUploadId: upload.id,
      });
    }
    this.logger.log({
      msg: 'bulk upload persisted',
      uploadId: upload.id,
      accepted: accepted.length,
      rejected: summary.rejected.length,
    });
    return upload.id;
  }

  private async storeFile(storedPath: string, content: Buffer): Promise<void> {
    const absolute = join(this.config.storageDir, storedPath);
    await mkdir(join(this.config.storageDir, CSV_IMPORT.UPLOAD_DIR), { recursive: true });
    await writeFile(absolute, content);
  }
}

function toView(row: BulkUploadRow, withSummary: boolean): BulkUploadResponseDto {
  return {
    id: row.id,
    kind: row.kind,
    fileName: row.fileName,
    totalRows: row.totalRows,
    accepted: row.accepted,
    rejected: row.rejected,
    uploadedById: row.uploadedById,
    createdAt: row.createdAt,
    ...(withSummary ? { summary: row.summary as unknown as CsvSummaryResponseDto } : {}),
  };
}
