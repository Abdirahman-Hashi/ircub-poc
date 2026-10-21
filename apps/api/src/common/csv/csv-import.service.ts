import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { parse } from 'csv-parse';

import { ErrorCode } from '@ircub/shared';

import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../errors/app.exception';

import { CSV_IMPORT, CSV_REASON } from './csv.constants';
import { CSV_MESSAGES } from './csv.messages';
import { lineNumberOf, missingColumns, stripBom } from './csv.rules';

import type {
  AcceptedRow,
  CsvImportOptions,
  CsvImportResult,
  ParsedCsv,
  RejectedRow,
} from './csv.types';

/**
 * Shared bulk-import pipeline (D12): streaming parse → header check → per-row schema
 * validation (zod) → per-row business validation → persist accepted rows in one
 * transaction. Invalid rows are rejected individually with their line number, field and
 * reason; valid rows are saved. `dryRun` runs everything except `persist`.
 */
@Injectable()
export class CsvImportService {
  private readonly logger = new Logger(CsvImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async run<TRow, TContext>(
    options: CsvImportOptions<TRow, TContext>,
  ): Promise<CsvImportResult<TRow>> {
    const { headers, records } = await this.parse(options.content);
    const missing = missingColumns(headers, options.expectedColumns);
    if (missing.length > 0) {
      throw new AppException(
        ErrorCode.CSV_INVALID,
        CSV_MESSAGES.MISSING_COLUMNS,
        HttpStatus.UNPROCESSABLE_ENTITY,
        {
          reason: CSV_REASON.MISSING_COLUMNS,
          missing,
        },
      );
    }
    if (records.length > options.maxRows) {
      throw new AppException(
        ErrorCode.CSV_TOO_MANY_ROWS,
        CSV_MESSAGES.TOO_MANY_ROWS,
        HttpStatus.UNPROCESSABLE_ENTITY,
        {
          reason: CSV_REASON.TOO_MANY_ROWS,
          rows: records.length,
          maxRows: options.maxRows,
        },
      );
    }

    const context = await options.createContext();
    const accepted: AcceptedRow<TRow>[] = [];
    const rejected: RejectedRow[] = [];

    for (const [index, record] of records.entries()) {
      const row = lineNumberOf(index);
      const parsed = options.schema.safeParse(record);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const field = issue?.path.map(String).join('.');
        rejected.push({
          row,
          ...(field === undefined || field.length === 0 ? {} : { field }),
          reason: CSV_REASON.SCHEMA,
          message: issue?.message ?? CSV_MESSAGES.MALFORMED,
        });
        continue;
      }
      const outcome = await options.validateRow(parsed.data, row, context);
      if (outcome.ok) {
        accepted.push({ row, data: parsed.data });
      } else {
        rejected.push({
          row,
          ...(outcome.field === undefined ? {} : { field: outcome.field }),
          reason: outcome.reason,
          message: outcome.message,
        });
      }
    }

    const draft = {
      totalRows: records.length,
      accepted: accepted.length,
      rejected,
      dryRun: options.dryRun,
    };
    const uploadId = options.dryRun
      ? undefined
      : await this.prisma.$transaction((tx) => options.persist(accepted, draft, context, tx));
    this.logger.log({
      msg: 'csv import',
      totalRows: records.length,
      accepted: accepted.length,
      rejected: rejected.length,
      dryRun: options.dryRun,
      uploadId,
    });

    return {
      summary: { ...draft, ...(uploadId === undefined ? {} : { uploadId }) },
      acceptedRows: accepted,
    };
  }

  private parse(content: Buffer): Promise<ParsedCsv> {
    const text = stripBom(content.toString(CSV_IMPORT.ENCODING));
    if (text.trim().length === 0) {
      throw new AppException(
        ErrorCode.CSV_INVALID,
        CSV_MESSAGES.EMPTY_FILE,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return new Promise((resolve, reject) => {
      const records: Record<string, string>[] = [];
      let headers: string[] = [];
      const parser = parse(text, {
        delimiter: CSV_IMPORT.DELIMITER,
        bom: true,
        trim: true,
        skip_empty_lines: true,
        relax_column_count: true,
        columns: (header: string[]) => {
          headers = header.map((column) => column.trim().toLowerCase());
          return headers;
        },
      });
      parser.on('readable', () => {
        for (
          let record = parser.read() as Record<string, string> | null;
          record !== null;
          record = parser.read() as Record<string, string> | null
        ) {
          records.push(record);
        }
      });
      parser.on('error', (error: Error) => {
        reject(
          new AppException(
            ErrorCode.CSV_INVALID,
            CSV_MESSAGES.MALFORMED,
            HttpStatus.UNPROCESSABLE_ENTITY,
            { cause: error.message },
          ),
        );
      });
      parser.on('end', () => {
        resolve({ headers, records });
      });
    });
  }
}
