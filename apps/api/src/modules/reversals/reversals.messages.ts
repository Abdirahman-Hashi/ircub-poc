export const REVERSALS_MESSAGES = {
  NOT_FOUND: 'Reversal not found.',
  PAYMENT_NOT_REVERSIBLE: 'Only confirmed payments can be reversed.',
  PENDING_EXISTS: 'A reversal request is already pending for this payment.',
  ALREADY_DECIDED: 'This reversal has already been decided.',
  SOD: 'The user who captured a reversal cannot approve or reject it.',
} as const;
