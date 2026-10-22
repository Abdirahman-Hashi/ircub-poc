import { Injectable } from '@nestjs/common';

import { PERMISSION_GROUPS, type PermissionCode } from '@ircub/shared';

import { getRequestContext } from '../../common/context/request-context.storage';
import { PrismaService } from '../../prisma/prisma.service';

import { applyOverrides, resolveEffectivePermissions } from './permissions.rules';

import type { PermissionGroupResponseDto } from './dto/permission-group.response.dto';
import type { PermissionOverrides, RoleGraph, RoleNode } from './permissions.types';

/**
 * Resolves what a user may do (D6). Reads the whole role graph per call — it is tiny
 * (tens of rows) and the result is cached per request, so a request with several
 * permission checks hits the database once.
 */
@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getEffectivePermissions(userId: string): Promise<ReadonlySet<PermissionCode>> {
    const context = getRequestContext();
    const cached = context?.permissionCache?.get(userId);
    if (cached !== undefined) {
      return cached;
    }
    const result = (await this.resolveForUsers([userId])).get(userId) ?? new Set<PermissionCode>();
    if (context !== undefined) {
      context.permissionCache ??= new Map();
      context.permissionCache.set(userId, result);
    }
    return result;
  }

  /**
   * Effective permissions for several users, optionally under proposed changes. This is
   * the primitive SoD enforcement uses on both assignment paths.
   */
  async resolveForUsers(
    userIds: readonly string[],
    overrides: PermissionOverrides = {},
  ): Promise<Map<string, ReadonlySet<PermissionCode>>> {
    const [graph, memberships] = await Promise.all([
      this.loadRoleGraph(),
      this.loadUserRoleIds(userIds),
    ]);
    const effectiveGraph = applyOverrides(graph, overrides);
    const result = new Map<string, ReadonlySet<PermissionCode>>();
    for (const userId of userIds) {
      const roleIds = overrides.userRoleIds?.get(userId) ?? memberships.get(userId) ?? [];
      result.set(userId, resolveEffectivePermissions(roleIds, effectiveGraph));
    }
    return result;
  }

  async loadRoleGraph(): Promise<RoleGraph> {
    const roles = await this.prisma.role.findMany({
      include: { permissions: { include: { permission: { select: { code: true } } } } },
    });
    const graph = new Map<string, RoleNode>();
    for (const role of roles) {
      graph.set(role.id, {
        id: role.id,
        code: role.code,
        name: role.name,
        parentId: role.parentId,
        isSystem: role.isSystem,
        permissionCodes: role.permissions.map((rp) => rp.permission.code as PermissionCode),
      });
    }
    return graph;
  }

  async loadUserRoleIds(userIds: readonly string[]): Promise<Map<string, string[]>> {
    const rows = await this.prisma.userRole.findMany({ where: { userId: { in: [...userIds] } } });
    const result = new Map<string, string[]>();
    for (const row of rows) {
      const list = result.get(row.userId) ?? [];
      list.push(row.roleId);
      result.set(row.userId, list);
    }
    return result;
  }

  /** Users holding any of the given roles (used to find who a role change affects). */
  async userIdsWithRoles(roleIds: readonly string[]): Promise<string[]> {
    const rows = await this.prisma.userRole.findMany({
      where: { roleId: { in: [...roleIds] } },
      select: { userId: true },
      distinct: ['userId'],
    });
    return rows.map((row) => row.userId);
  }

  /** Every user whose effective permissions include `code` (e.g. supervisors to notify). */
  async userIdsHolding(code: PermissionCode): Promise<string[]> {
    const memberships = await this.prisma.userRole.findMany({
      select: { userId: true },
      distinct: ['userId'],
    });
    const effective = await this.resolveForUsers(memberships.map((row) => row.userId));
    return [...effective.entries()].filter(([, held]) => held.has(code)).map(([userId]) => userId);
  }

  /** Permissions grouped in the order the admin matrix shows them. */
  async listGrouped(): Promise<PermissionGroupResponseDto[]> {
    const rows = await this.prisma.permission.findMany({ orderBy: { code: 'asc' } });
    const byCode = new Map(rows.map((row) => [row.code, row]));
    return PERMISSION_GROUPS.map((group) => ({
      group: group.group,
      permissions: group.permissions
        .map((code) => byCode.get(code))
        .filter((row): row is NonNullable<typeof row> => row !== undefined)
        .map((row) => ({
          id: row.id,
          code: row.code,
          description: row.description,
          group: row.group,
        })),
    }));
  }
}
