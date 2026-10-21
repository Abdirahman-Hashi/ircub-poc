import { z } from 'zod';

const CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

export const createRoleSchema = z.object({
  code: z.string().regex(CODE_PATTERN, 'UPPER_SNAKE_CASE, e.g. CASHIER'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  parentId: z.string().optional(),
});

export type CreateRoleForm = z.infer<typeof createRoleSchema>;
