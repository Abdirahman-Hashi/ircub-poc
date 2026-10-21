export const BULK_MESSAGES = {
  NOT_FOUND: 'Upload not found.',
  FILE_REQUIRED: 'A CSV file is required (multipart field "file").',
  INVALID_CONTROL_NUMBER: 'Control number format or check digits are invalid.',
  UNKNOWN_ASSESSMENT: 'No assessment with this control number.',
  ASSESSMENT_NOT_PAYABLE: 'Assessment is cancelled or already paid.',
  AMOUNT_NOT_POSITIVE: 'Amount must be greater than zero.',
  OVERPAYMENT: 'Amount exceeds the outstanding balance (after earlier rows in this file).',
  TXN_REF_REQUIRED: 'A channel transaction reference is required for non-cash rows.',
  DUPLICATE_IN_FILE: 'The same channel transaction reference appears earlier in this file.',
  DUPLICATE_IN_DB: 'A payment with this channel transaction reference already exists.',
  UNKNOWN_CAPTURER: 'No active user with this email.',
  FX_RATE_UNAVAILABLE: 'No exchange rate available for this currency.',
} as const;
