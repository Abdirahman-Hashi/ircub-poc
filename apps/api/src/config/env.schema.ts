import { z } from 'zod';

import {
  CORS_ORIGIN_SEPARATOR,
  ENV_DEFAULTS,
  ENV_LIMITS,
  LOG_LEVELS,
  NODE_ENVS,
} from './env.constants';

/**
 * The single description of the process environment. ConfigModule runs `validateEnv` at
 * boot, so a missing or malformed variable stops the API before it accepts traffic.
 * Nothing outside this directory reads `process.env` (standards §1, §5).
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(NODE_ENVS).default(ENV_DEFAULTS.NODE_ENV),
  PORT: z.coerce.number().int().positive().default(ENV_DEFAULTS.PORT),
  LOG_LEVEL: z.enum(LOG_LEVELS).default(ENV_DEFAULTS.LOG_LEVEL),

  DATABASE_URL: z.url(),

  JWT_SECRET: z.string().min(ENV_LIMITS.MIN_SECRET_LENGTH),
  JWT_REFRESH_SECRET: z.string().min(ENV_LIMITS.MIN_SECRET_LENGTH),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(ENV_DEFAULTS.JWT_ACCESS_TTL_SECONDS),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(ENV_DEFAULTS.JWT_REFRESH_TTL_SECONDS),

  MOCKS_BASE_URL: z.url(),
  MOCK_SHARED_SECRET: z.string().min(ENV_LIMITS.MIN_SHARED_SECRET_LENGTH),

  API_PUBLIC_URL: z.url(),
  CORS_ORIGIN: z
    .string()
    .min(1)
    .transform((value) =>
      value
        .split(CORS_ORIGIN_SEPARATOR)
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),

  STORAGE_DIR: z.string().min(1).default(ENV_DEFAULTS.STORAGE_DIR),
});

export type Env = z.infer<typeof envSchema>;
export type NodeEnv = Env['NODE_ENV'];
export type LogLevel = Env['LOG_LEVEL'];

/** Used by `ConfigModule.forRoot({ validate })`; throws a readable report on failure. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
