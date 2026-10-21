import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginForm = z.infer<typeof loginSchema>;

const TOTP_DIGITS = 6;

export const mfaSchema = z.object({
  code: z.string().length(TOTP_DIGITS, `Enter the ${TOTP_DIGITS}-digit code`),
});

export type MfaForm = z.infer<typeof mfaSchema>;
