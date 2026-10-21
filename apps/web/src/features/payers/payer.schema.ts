import { z } from 'zod';

import { PayerType } from '@ircub/shared';

export const payerSchema = z.object({
  type: z.enum(PayerType),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().optional(),
  nationalId: z.string().optional(),
  registrationNo: z.string().optional(),
  address: z.string().optional(),
});

export type PayerForm = z.infer<typeof payerSchema>;
