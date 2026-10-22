import type { Prisma } from '@prisma/client';

/** Prisma client error codes the services translate into domain errors. */
export const PRISMA_ERROR = {
  UNIQUE_VIOLATION: 'P2002',
} as const;

export const PRISMA_LOG_LEVELS: Readonly<Record<'PRODUCTION' | 'DEVELOPMENT', Prisma.LogLevel[]>> =
  {
    PRODUCTION: ['warn', 'error'],
    DEVELOPMENT: ['warn', 'error'],
  };
