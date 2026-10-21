import type { PermissionCode } from '@ircub/shared';

export interface SodRulePair {
  readonly permissionACode: PermissionCode;
  readonly permissionBCode: PermissionCode;
  readonly description: string;
}

export interface SodConflict extends SodRulePair {
  readonly userId: string;
}
