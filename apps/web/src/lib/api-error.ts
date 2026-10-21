import type { ErrorResponse } from '../api/types';

/** Thrown by `apiFetch` for any non-2xx response; carries the API's stable `code`. */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: ErrorResponse['code'];
  readonly details: unknown;
  readonly requestId: string | undefined;

  constructor(body: ErrorResponse) {
    super(body.message);
    this.name = ApiError.name;
    this.statusCode = body.statusCode;
    this.code = body.code;
    this.details = body.details;
    this.requestId = body.requestId;
  }
}
