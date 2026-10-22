export const PAYMENTS_MESSAGES = {
  NOT_FOUND: 'Payment not found.',
  UNKNOWN_CONTROL_NUMBER: 'No assessment with this control number.',
  INVALID_CONTROL_NUMBER: 'Control number format or check digits are invalid.',
  DUPLICATE_TXN_REF: 'A payment with this channel reference already exists.',
  TXN_REF_REQUIRED:
    'A channel transaction reference is required for bank and mobile money payments.',
  INVALID_SIGNATURE: 'Callback signature is invalid.',
  AMOUNT_MISMATCH: 'Channel reported a different amount or currency than initiated.',
  INITIATION_FAILED: 'The channel did not accept the payment.',
  CHANNEL_FAILED: 'Channel reported the payment as failed.',
  PERMANENTLY_FAILED: 'Status could not be confirmed after the maximum number of checks.',
  OVERPAYMENT: 'Amount exceeds the outstanding balance.',
  NOT_OWN_PAYER: 'You can only pay your own assessments and bills.',
  STATUS_STILL_PENDING: 'Channel still reports the payment as pending.',
  CHANNEL_NOT_ONLINE: 'Only bank and mobile money payments can be initiated online.',
} as const;
