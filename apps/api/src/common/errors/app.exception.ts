import { HttpException, type HttpStatus } from '@nestjs/common';

import type { ErrorCode, ErrorResponse } from '@ircub/shared';

/**
 * The only exception business code throws (standards §4). `code` is the stable contract
 * the web switches on; `message` is for humans; `details` carries structured context
 * (field errors, ids) and must never contain secrets.
 */
export class AppException extends HttpException {
  readonly code: ErrorCode;
  readonly details: unknown;

  constructor(code: ErrorCode, message: string, status: HttpStatus, details?: unknown) {
    super(message, status);
    this.name = AppException.name;
    this.code = code;
    this.details = details;
  }

  toResponse(requestId?: string): ErrorResponse {
    const body: ErrorResponse = {
      statusCode: this.getStatus(),
      code: this.code,
      message: this.message,
      ...(this.details === undefined ? {} : { details: this.details }),
      ...(requestId === undefined ? {} : { requestId }),
    };
    return body;
  }
}
