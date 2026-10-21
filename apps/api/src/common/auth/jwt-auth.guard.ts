import { type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { ErrorCode } from '@ircub/shared';

import { AppException } from '../errors/app.exception';

import { AUTH_METADATA, JWT_STRATEGY_NAME } from './auth.constants';
import { AUTH_MESSAGES } from './auth.messages';

import type { AuthenticatedUser } from './auth.types';
import type { Observable } from 'rxjs';

/** Global guard: every route needs a valid access token unless marked `@Public()`. */
@Injectable()
export class JwtAuthGuard extends AuthGuard(JWT_STRATEGY_NAME) {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      AUTH_METADATA.IS_PUBLIC,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic === true) {
      return true;
    }
    return super.canActivate(context);
  }

  override handleRequest<TUser = AuthenticatedUser>(err: unknown, user: TUser | false): TUser {
    if (err instanceof AppException) {
      throw err;
    }
    if (err !== null && err !== undefined) {
      throw new AppException(
        ErrorCode.UNAUTHENTICATED,
        AUTH_MESSAGES.MISSING_TOKEN,
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (user === false) {
      throw new AppException(
        ErrorCode.UNAUTHENTICATED,
        AUTH_MESSAGES.MISSING_TOKEN,
        HttpStatus.UNAUTHORIZED,
      );
    }
    return user;
  }
}
