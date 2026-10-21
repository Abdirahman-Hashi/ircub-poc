import { z } from 'zod';

import { RateType } from '@ircub/shared';

const CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const MONEY_PATTERN = /^[0-9]+(\.[0-9]{1,2})?$/;

export const revenueTypeSchema = z.object({
  code: z.string().regex(CODE_PATTERN, 'UPPER_SNAKE_CASE'),
  name: z.string().min(1),
  rateType: z.enum(RateType),
  rate: z.string().regex(MONEY_PATTERN, 'Decimal with up to 2 places'),
  glCode: z.string().min(1),
  description: z.string().optional(),
});

export type RevenueTypeForm = z.infer<typeof revenueTypeSchema>;
