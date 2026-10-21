import type { PermissionCode } from '@ircub/shared';

/** One role in the hierarchy graph, with its directly assigned permissions. */
export interface RoleNode {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly parentId: string | null;
  readonly isSystem: boolean;
  readonly permissionCodes: readonly PermissionCode[];
}

export type RoleGraph = ReadonlyMap<string, RoleNode>;

/**
 * Hypothetical changes evaluated *before* they are written, so SoD can reject an assignment
 * without touching the database (and without leaving audit rows for a rolled-back write).
 */
export interface PermissionOverrides {
  /** Proposed full set of role ids for a user. */
  readonly userRoleIds?: ReadonlyMap<string, readonly string[]>;
  /** Proposed full set of direct permission codes for a role. */
  readonly rolePermissionCodes?: ReadonlyMap<string, readonly PermissionCode[]>;
  /** Proposed new parent for a role (`null` = top-level). */
  readonly roleParentId?: ReadonlyMap<string, string | null>;
}
