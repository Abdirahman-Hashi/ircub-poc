import type { ErrorCode } from '../error-codes';

/** Body of every non-2xx API response, produced by the global exception filter. */
export interface ErrorResponse {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly message: string;
  readonly details?: unknown;
  readonly requestId?: string;
}
