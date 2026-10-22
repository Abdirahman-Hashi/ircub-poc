export const CHANNELS_MESSAGES = {
  UNAVAILABLE: 'The payment channel is unavailable; please try again later.',
  NOT_SUPPORTED: 'Online initiation is only available for bank and mobile money.',
  INVALID_SIGNATURE: 'Callback signature is invalid.',
  STATEMENT_INVALID: 'The statement could not be parsed.',
} as const;
