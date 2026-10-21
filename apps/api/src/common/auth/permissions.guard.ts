import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ErrorCode, type PermissionCode } from '@ircub/shared';

import { PermissionsService } from '../../modules/permissions/permissions.service';
import { AppException } from '../errors/app.exception';

import { AUTH_METADATA } from './auth.constants';
import { AUTH_MESSAGES } from './auth.messages';

import type { RequestWithUser } from './auth.types';

/**
 * Global guard: a handler decorated with `@RequirePermission(...codes)` is allowed only if
 * the caller's effective permissions (own roles + inherited, D6) contain every code.
 * Runs after JwtAuthGuard, so `request.user` is set unless the route is public.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<readonly PermissionCode[] | undefined>(
      AUTH_METADATA.REQUIRED_PERMISSIONS,
      [context.getHandler(), context.getClass()],
    );
    if (required === undefined || required.length === 0) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest<RequestWithUser>();
    if (user === undefined) {
      throw new AppException(
        ErrorCode.UNAUTHENTICATED,
        AUTH_MESSAGES.MISSING_TOKEN,
        HttpStatus.UNAUTHORIZED,
      );
    }
    const held = await this.permissions.getEffectivePermissions(user.id);
    const missing = required.filter((code) => !held.has(code));
    if (missing.length > 0) {
      throw new AppException(ErrorCode.FORBIDDEN, AUTH_MESSAGES.FORBIDDEN, HttpStatus.FORBIDDEN, {
        required,
        missing,
      });
    }
    return true;
  }
}
