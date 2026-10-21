import { z } from 'zod';

import { ENV_DEFAULTS, ENV_LIMITS, NODE_ENVS } from './env.constants';

export const envSchema = z.object({
  NODE_ENV: z.enum(NODE_ENVS).default(ENV_DEFAULTS.NODE_ENV),
  MOCKS_PORT: z.coerce.number().int().positive().default(ENV_DEFAULTS.MOCKS_PORT),
  LOG_LEVEL: z.string().default(ENV_DEFAULTS.LOG_LEVEL),
  MOCK_SHARED_SECRET: z.string().min(ENV_LIMITS.MIN_SHARED_SECRET_LENGTH),
  MOCK_CALLBACK_DELAY_MS: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(ENV_DEFAULTS.MOCK_CALLBACK_DELAY_MS),
});

export type MocksEnv = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): MocksEnv {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid mocks environment:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
