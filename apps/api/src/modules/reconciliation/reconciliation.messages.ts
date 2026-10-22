export const RECONCILIATION_MESSAGES = {
  RUN_NOT_FOUND: 'Reconciliation run not found.',
  STATEMENT_INVALID: 'Statement file could not be parsed.',
  STATEMENT_NOT_FOUND: 'Channel statement not found.',
  FILE_REQUIRED: 'A statement file is required.',
  NOTE_MISSING_IN_IRCUB: 'Channel settled a transaction IRCUB has no confirmed payment for.',
  NOTE_MISSING_IN_CHANNEL: 'IRCUB confirmed a payment the channel statement does not list.',
  NOTE_AMOUNT_MISMATCH: 'Amounts differ between IRCUB and the channel.',
} as const;
