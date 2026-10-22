import { z } from 'zod';

import { DASHBOARD } from '@ircub/shared';

/** One data row of the revenue-targets template. */
export const revenueTargetRowSchema = z.object({
  period: z.string().trim().regex(DASHBOARD.PERIOD_PATTERN, 'period must be YYYY-MM'),
  revenue_type_code: z.string().trim().min(1, 'revenue_type_code is required'),
  amount: z
    .string()
    .trim()
    .regex(/^[0-9]+(\.[0-9]{1,2})?$/, 'amount must be a positive number with up to 2 decimals'),
});

export type RevenueTargetRow = z.infer<typeof revenueTargetRowSchema>;
