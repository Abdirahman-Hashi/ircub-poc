export const CSV_MESSAGES = {
  EMPTY_FILE: 'The file is empty.',
  MISSING_COLUMNS: 'The header row is missing required columns.',
  TOO_MANY_ROWS: 'The file has more rows than the configured maximum.',
  UNSUPPORTED_FILE_TYPE: 'Only CSV files are accepted.',
  MALFORMED: 'The file could not be parsed as CSV.',
} as const;
