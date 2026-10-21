import type { TransactionClient } from '../../prisma/prisma.types';
import type { ZodType } from 'zod';

export interface RejectedRow {
  /** 1-based line number in the file (header is line 1). */
  readonly row: number;
  readonly field?: string;
  readonly reason: string;
  readonly message: string;
}

export interface AcceptedRow<TRow> {
  readonly row: number;
  readonly data: TRow;
}

export type RowOutcome =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly field?: string;
      readonly reason: string;
      readonly message: string;
    };

/** Summary returned to the client (D12) and stored on `BulkUpload.summary`. */
export interface CsvImportSummary {
  readonly totalRows: number;
  readonly accepted: number;
  readonly rejected: readonly RejectedRow[];
  readonly dryRun: boolean;
  readonly uploadId?: string;
}

export interface CsvImportOptions<TRow, TContext> {
  readonly content: Buffer;
  readonly expectedColumns: readonly string[];
  readonly schema: ZodType<TRow>;
  readonly maxRows: number;
  readonly dryRun: boolean;
  /** Built once before validation; shared across rows (lookups, running totals). */
  readonly createContext: () => Promise<TContext>;
  /** Business validation of one parsed row; may mutate the context (e.g. running totals). */
  readonly validateRow: (data: TRow, rowNumber: number, context: TContext) => Promise<RowOutcome>;
  /**
   * Called once with every accepted row inside one transaction (skipped on dry run). Receives
   * the summary so it can be stored alongside; returns the upload id to report back.
   */
  readonly persist: (
    accepted: readonly AcceptedRow<TRow>[],
    summary: CsvImportSummary,
    context: TContext,
    tx: TransactionClient,
  ) => Promise<string | undefined>;
}

export interface CsvImportResult<TRow> {
  readonly summary: CsvImportSummary;
  readonly acceptedRows: readonly AcceptedRow<TRow>[];
}

export interface ParsedCsv {
  readonly headers: readonly string[];
  readonly records: readonly Record<string, string>[];
}
