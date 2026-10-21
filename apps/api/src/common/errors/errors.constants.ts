import { HttpStatus } from '@nestjs/common';

import { ErrorCode } from '@ircub/shared';

/** Status codes at or above this are logged with a stack trace. */
export const SERVER_ERROR_MIN_STATUS: number = HttpStatus.INTERNAL_SERVER_ERROR;

/**
 * Maps the status of a framework-raised HttpException (ValidationPipe, ThrottlerGuard,
 * route-not-found, guards) onto a stable ErrorCode. Anything unlisted is INTERNAL_ERROR.
 */
export const HTTP_STATUS_TO_ERROR_CODE: Readonly<Partial<Record<number, ErrorCode>>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_FAILED,
  [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorCode.VALIDATION_FAILED,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHENTICATED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RATE_LIMITED,
};
