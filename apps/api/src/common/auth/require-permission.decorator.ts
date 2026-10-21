import { type CustomDecorator, SetMetadata } from '@nestjs/common';

import type { PermissionCode } from '@ircub/shared';

import { AUTH_METADATA } from './auth.constants';

/**
 * Declares the permission a handler needs. The PermissionsGuard (phase 1) reads it;
 * until then the decorator only documents intent in Swagger-adjacent code.
 */
export const RequirePermission = (code: PermissionCode): CustomDecorator =>
  SetMetadata(AUTH_METADATA.REQUIRED_PERMISSION, code);
