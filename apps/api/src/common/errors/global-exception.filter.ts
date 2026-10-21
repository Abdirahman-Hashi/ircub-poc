import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import { ErrorCode, type ErrorResponse } from '@ircub/shared';

import { getRequestId } from '../context/request-context.storage';

import { AppException } from './app.exception';
import { HTTP_STATUS_TO_ERROR_CODE, SERVER_ERROR_MIN_STATUS } from './errors.constants';
import { ERROR_MESSAGES } from './errors.messages';

import type { HttpExceptionBody } from './errors.types';
import type { Request, Response } from 'express';

/**
 * Turns every thrown value into the `{ statusCode, code, message, details?, requestId }`
 * contract (standards §4). Unknown errors are logged with the request id and returned as
 * INTERNAL_ERROR without leaking internals.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    const requestId = getRequestId();

    const body = this.toBody(exception, requestId);

    if (body.statusCode >= SERVER_ERROR_MIN_STATUS) {
      this.logger.error(
        { requestId, method: request.method, url: request.originalUrl, code: body.code },
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn({
        requestId,
        method: request.method,
        url: request.originalUrl,
        statusCode: body.statusCode,
        code: body.code,
      });
    }

    response.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown, requestId: string | undefined): ErrorResponse {
    if (exception instanceof AppException) {
      return exception.toResponse(requestId);
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const raw = exception.getResponse();
      const nestBody: HttpExceptionBody = typeof raw === 'string' ? { message: raw } : raw;
      const messages = nestBody.message;
      const isValidationList = Array.isArray(messages);

      return {
        statusCode,
        code: HTTP_STATUS_TO_ERROR_CODE[statusCode] ?? ErrorCode.INTERNAL_ERROR,
        message: isValidationList
          ? ERROR_MESSAGES.VALIDATION
          : ((messages as string | undefined) ?? exception.message),
        ...(isValidationList ? { details: messages } : {}),
        ...(requestId === undefined ? {} : { requestId }),
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: ERROR_MESSAGES.INTERNAL,
      ...(requestId === undefined ? {} : { requestId }),
    };
  }
}
