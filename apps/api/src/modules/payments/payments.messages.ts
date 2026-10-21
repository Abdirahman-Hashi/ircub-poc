export const PAYMENTS_MESSAGES = {
  NOT_FOUND: 'Payment not found.',
  UNKNOWN_CONTROL_NUMBER: 'No assessment with this control number.',
  INVALID_CONTROL_NUMBER: 'Control number format or check digits are invalid.',
  DUPLICATE_TXN_REF: 'A payment with this channel reference already exists.',
  TXN_REF_REQUIRED:
    'A channel transaction reference is required for bank and mobile money payments.',
} as const;
