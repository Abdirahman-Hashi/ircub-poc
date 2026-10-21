import { CSV } from '@ircub/shared';

export const CSV_IMPORT = {
  DELIMITER: CSV.DELIMITER,
  /** Multer/multipart field name for the uploaded file. */
  FILE_FIELD: 'file',
  /** Hard cap on upload size regardless of row count. */
  MAX_FILE_BYTES: 5 * 1024 * 1024,
  ALLOWED_MIME_TYPES: CSV.MIME_TYPES,
  /** Header row is line 1; data rows are reported with their 1-based line number. */
  FIRST_DATA_ROW: 2,
  /** Sub-directory of STORAGE_DIR where uploaded files are kept for the audit trail. */
  UPLOAD_DIR: 'uploads',
  ENCODING: 'utf8',
  BOM: '﻿',
} as const;

/** Rejection reasons shared by every importer; module-specific ones live in that module. */
export const CSV_REASON = {
  MISSING_COLUMNS: 'MISSING_COLUMNS',
  TOO_MANY_ROWS: 'TOO_MANY_ROWS',
  MALFORMED_ROW: 'MALFORMED_ROW',
  SCHEMA: 'SCHEMA',
} as const;
