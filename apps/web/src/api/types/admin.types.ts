import type { UserStatus } from '@ircub/shared';

export interface UserListParams {
  readonly page: number;
  readonly pageSize: number;
  readonly search?: string;
  readonly status?: UserStatus;
  readonly roleId?: string;
}

export interface CreateUserInput {
  readonly email: string;
  readonly fullName: string;
  readonly roleIds: readonly string[];
}

export interface CreateRoleInput {
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly parentId?: string;
}

export interface CreateSodRuleInput {
  readonly permissionACode: string;
  readonly permissionBCode: string;
  readonly description: string;
}

export interface ChangePasswordInput {
  readonly currentPassword: string;
  readonly newPassword: string;
}
