import type { UserStatus } from '../enums';
import type { PermissionCode } from '../permissions';
import type { RoleSummary } from './auth.types';

export interface UserSummary {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly status: UserStatus;
  readonly mfaEnabled: boolean;
  readonly lockedUntil: Date | string | null;
  readonly roles: readonly RoleSummary[];
  readonly createdAt: Date | string;
}

export interface CreatedUser extends UserSummary {
  readonly temporaryPassword: string;
}

export interface RoleDetail {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly parentId: string | null;
  readonly isSystem: boolean;
  readonly permissionCodes: readonly PermissionCode[];
  readonly inheritedPermissionCodes: readonly PermissionCode[];
  readonly userCount: number;
}

export interface PermissionView {
  readonly id: string;
  readonly code: string;
  readonly description: string;
  readonly group: string;
}

export interface PermissionGroupView {
  readonly group: string;
  readonly permissions: readonly PermissionView[];
}

export interface SodRuleView {
  readonly id: string;
  readonly permissionACode: PermissionCode;
  readonly permissionBCode: PermissionCode;
  readonly description: string;
  readonly createdAt: Date | string;
}

export interface SystemConfigEntryView {
  readonly key: string;
  readonly value: unknown;
  readonly defaultValue: unknown;
  readonly description: string;
  readonly updatedAt: Date | string | null;
}
