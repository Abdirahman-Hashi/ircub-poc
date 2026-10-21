import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.email('Enter a valid email'),
  fullName: z.string().min(1, 'Full name is required'),
  roleIds: z.array(z.string()),
});

export type CreateUserForm = z.infer<typeof createUserSchema>;
