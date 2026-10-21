import type { PermissionCode, RoleCode } from '@ircub/shared';

export interface RoleSeed {
  readonly code: RoleCode;
  readonly name: string;
  readonly description: string;
  readonly parentCode: RoleCode | null;
  /** Direct permissions; `{ allExcept }` grants every code but the listed ones. */
  readonly permissions:
    readonly PermissionCode[] | { readonly allExcept: readonly PermissionCode[] };
}

export interface UserSeed {
  readonly email: string;
  readonly fullName: string;
  readonly roleCodes: readonly RoleCode[];
}
