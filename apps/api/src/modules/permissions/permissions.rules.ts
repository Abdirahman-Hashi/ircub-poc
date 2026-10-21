import type { PermissionCode } from '@ircub/shared';

import type { PermissionOverrides, RoleGraph, RoleNode } from './permissions.types';

/**
 * Effective permissions = union of every held role's permissions and, recursively, its
 * ancestors' (D6). Cycle-safe: a role is visited at most once, so a mis-configured
 * parent loop degrades to "no further inheritance" instead of hanging the request.
 */
export function resolveEffectivePermissions(
  roleIds: readonly string[],
  graph: RoleGraph,
): ReadonlySet<PermissionCode> {
  const effective = new Set<PermissionCode>();
  const visited = new Set<string>();
  const stack = [...roleIds];
  while (stack.length > 0) {
    const roleId = stack.pop();
    if (roleId === undefined || visited.has(roleId)) {
      continue;
    }
    visited.add(roleId);
    const role = graph.get(roleId);
    if (role === undefined) {
      continue;
    }
    for (const code of role.permissionCodes) {
      effective.add(code);
    }
    if (role.parentId !== null) {
      stack.push(role.parentId);
    }
  }
  return effective;
}

/** Permissions a role gets from its ancestors only (shown greyed in the matrix UI). */
export function resolveInheritedPermissions(
  roleId: string,
  graph: RoleGraph,
): ReadonlySet<PermissionCode> {
  const role = graph.get(roleId);
  if (role === undefined || role.parentId === null) {
    return new Set();
  }
  return resolveEffectivePermissions([role.parentId], graph);
}

/** The role itself plus every role that (transitively) inherits from it. */
export function collectDescendantRoleIds(roleId: string, graph: RoleGraph): ReadonlySet<string> {
  const result = new Set<string>([roleId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const role of graph.values()) {
      if (role.parentId !== null && result.has(role.parentId) && !result.has(role.id)) {
        result.add(role.id);
        grew = true;
      }
    }
  }
  return result;
}

/** True if setting `newParentId` on `roleId` would make the role its own ancestor. */
export function wouldCreateCycle(
  roleId: string,
  newParentId: string | null,
  graph: RoleGraph,
): boolean {
  const visited = new Set<string>();
  let current = newParentId;
  while (current !== null) {
    if (current === roleId) {
      return true;
    }
    if (visited.has(current)) {
      return false; // pre-existing loop elsewhere; not caused by this change
    }
    visited.add(current);
    current = graph.get(current)?.parentId ?? null;
  }
  return false;
}

/** Returns a copy of the graph with proposed permission sets / parents applied. */
export function applyOverrides(graph: RoleGraph, overrides: PermissionOverrides): RoleGraph {
  if (overrides.rolePermissionCodes === undefined && overrides.roleParentId === undefined) {
    return graph;
  }
  const copy = new Map<string, RoleNode>();
  for (const [id, role] of graph) {
    copy.set(id, {
      ...role,
      permissionCodes: overrides.rolePermissionCodes?.get(id) ?? role.permissionCodes,
      parentId:
        overrides.roleParentId?.has(id) === true
          ? (overrides.roleParentId.get(id) ?? null)
          : role.parentId,
    });
  }
  return copy;
}
