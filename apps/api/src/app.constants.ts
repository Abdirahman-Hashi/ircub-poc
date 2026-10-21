import type { ValidationPipeOptions } from '@nestjs/common';

export const APP = {
  NAME: 'IRCUB API',
  AUTHOR: 'Abdirahman Hashi',
  DESCRIPTION:
    'Integrated Revenue Collection & Utility Billing Platform — proof of concept API. ' +
    'Errors follow { statusCode, code, message, details?, requestId }.',
} as const;

export const SWAGGER = {
  PATH: 'docs',
  BEARER_SCHEME: 'bearer',
  /** Relative to apps/api; the export script writes the committed spec here. */
  EXPORT_PATH: '../../docs/openapi.json',
  EXPORT_INDENT: 2,
} as const;

/** Standards §5: reject unknown fields, strip nothing silently, transform to DTO classes. */
export const VALIDATION_PIPE_OPTIONS: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
};

/** Global request budget; login and callback endpoints get stricter limits in phase 1/4. */
export const THROTTLE = {
  DEFAULT: { name: 'default', ttlMs: 60_000, limit: 300 },
} as const;
