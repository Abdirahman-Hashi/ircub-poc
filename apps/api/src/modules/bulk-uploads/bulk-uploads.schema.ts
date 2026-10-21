import { z } from 'zod';

import { Currency } from '@ircub/shared';

import { MONEY_PATTERN } from '../assessments/assessments.constants';
import { MANUAL_CHANNELS } from '../payments/payments.constants';

const optionalText = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim() ?? '';
    return trimmed.length === 0 ? null : trimmed;
  });

/** Shape of one data row of the revenue-transactions template (brief Module 3.3, D12). */
export const revenueTransactionRowSchema = z.object({
  control_number: z.string().trim().min(1, 'control_number is required'),
  amount: z.string().trim().regex(MONEY_PATTERN, 'amount must be a decimal with up to 2 places'),
  currency: z.enum(Currency),
  channel: z.enum(MANUAL_CHANNELS),
  channel_txn_ref: optionalText,
  paid_at: z.coerce.date(),
  captured_by_email: optionalText.pipe(z.email().nullable()),
});

export type RevenueTransactionRow = z.infer<typeof revenueTransactionRowSchema>;
