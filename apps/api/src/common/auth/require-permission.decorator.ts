import { type CustomDecorator, SetMetadata } from '@nestjs/common';

import type { PermissionCode } from '@ircub/shared';

import { AUTH_METADATA } from './auth.constants';

/**
 * Declares the permission(s) a handler needs; the caller must hold all of them.
 * Read by `PermissionsGuard`.
 */
export const RequirePermission = (...codes: readonly PermissionCode[]): CustomDecorator =>
  SetMetadata(AUTH_METADATA.REQUIRED_PERMISSIONS, codes);
