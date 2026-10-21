import { CSV_IMPORT } from './csv.constants';

/** Column names present in the header but required by the template. */
export function missingColumns(headers: readonly string[], expected: readonly string[]): string[] {
  const present = new Set(headers.map((header) => header.trim().toLowerCase()));
  return expected.filter((column) => !present.has(column));
}

/** Line number of the n-th data record (0-based index) for error reports. */
export function lineNumberOf(recordIndex: number): number {
  return CSV_IMPORT.FIRST_DATA_ROW + recordIndex;
}

export function stripBom(text: string): string {
  return text.startsWith(CSV_IMPORT.BOM) ? text.slice(CSV_IMPORT.BOM.length) : text;
}

/** Builds the downloadable template: header row plus a blank line. */
export function templateCsv(columns: readonly string[]): string {
  return `${columns.join(CSV_IMPORT.DELIMITER)}\n`;
}

/** Escapes a value for a CSV cell (RFC 4180). Objects are serialised as JSON. */
export function csvCell(value: unknown): string {
  const text = cellText(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return value.toString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return JSON.stringify(value);
}

export function csvLine(values: readonly unknown[]): string {
  return values.map(csvCell).join(CSV_IMPORT.DELIMITER);
}
