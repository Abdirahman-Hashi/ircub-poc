import { z } from 'zod';

export const newAssessmentSchema = z.object({
  payerId: z.string().min(1, 'Choose a payer'),
  revenueTypeId: z.string().min(1, 'Choose a revenue type'),
  baseAmount: z.string().optional(),
  period: z.string().optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

export type NewAssessmentForm = z.infer<typeof newAssessmentSchema>;
