import type { Prisma } from '@prisma/client';

export const PRISMA_LOG_LEVELS: Readonly<Record<'PRODUCTION' | 'DEVELOPMENT', Prisma.LogLevel[]>> =
  {
    PRODUCTION: ['warn', 'error'],
    DEVELOPMENT: ['warn', 'error'],
  };
