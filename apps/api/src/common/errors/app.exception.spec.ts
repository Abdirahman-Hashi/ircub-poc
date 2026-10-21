import { HttpStatus } from '@nestjs/common';

import { ErrorCode } from '@ircub/shared';

import { AppException } from './app.exception';

describe('AppException', () => {
  it('is an HttpException carrying a stable code, status and optional details', () => {
    const details = { paymentId: 'p1', approverId: 'u1' };
    const exception = new AppException(
      ErrorCode.SOD_VIOLATION,
      'Approver cannot be the capturer',
      HttpStatus.FORBIDDEN,
      details,
    );

    expect(exception).toBeInstanceOf(Error);
    expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
    expect(exception.code).toBe(ErrorCode.SOD_VIOLATION);
    expect(exception.message).toBe('Approver cannot be the capturer');
    expect(exception.details).toEqual(details);
  });

  it('serialises to the { statusCode, code, message, details?, requestId? } contract', () => {
    const exception = new AppException(
      ErrorCode.NOT_FOUND,
      'Payer not found',
      HttpStatus.NOT_FOUND,
    );

    expect(exception.toResponse('req-1')).toEqual({
      statusCode: HttpStatus.NOT_FOUND,
      code: ErrorCode.NOT_FOUND,
      message: 'Payer not found',
      requestId: 'req-1',
    });
    expect(exception.toResponse()).not.toHaveProperty('details');
    expect(exception.toResponse()).not.toHaveProperty('requestId');
  });
});
