import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { ErrorCode, type PermissionCode } from '@ircub/shared';

import { AppException } from '../../common/errors/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import {
  collectDescendantRoleIds,
  resolveInheritedPermissions,
  wouldCreateCycle,
} from '../permissions/permissions.rules';
import { PermissionsService } from '../permissions/permissions.service';
import { SodService } from '../sod/sod.service';

import { ROLES_MESSAGES } from './roles.messages';

import type { RoleGraph } from '../permissions/permissions.types';
import type { CreateRoleDto } from './dto/create-role.dto';
import type { RoleResponseDto } from './dto/role.response.dto';
import type { UpdateRoleDto } from './dto/update-role.dto';
import type { RoleWithPermissions } from './roles.types';

const ROLE_INCLUDE = {
  permissions: { include: { permission: { select: { code: true } } } },
  _count: { select: { users: true, children: true } },
} as const;

/** Role catalogue, hierarchy and permission matrix (brief Module 1, D6). */
@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly sod: SodService,
  ) {}

  async list(): Promise<RoleResponseDto[]> {
    const [roles, graph] = await Promise.all([
      this.prisma.role.findMany({
        include: ROLE_INCLUDE,
        orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      }),
      this.permissions.loadRoleGraph(),
    ]);
    return roles.map((role) => toResponse(role, graph));
  }

  async get(id: string): Promise<RoleResponseDto> {
    const [role, graph] = await Promise.all([
      this.findOrThrow(id),
      this.permissions.loadRoleGraph(),
    ]);
    return toResponse(role, graph);
  }

  async create(dto: CreateRoleDto): Promise<RoleResponseDto> {
    if ((await this.prisma.role.findUnique({ where: { code: dto.code } })) !== null) {
      throw new AppException(ErrorCode.CONFLICT, ROLES_MESSAGES.CODE_TAKEN, HttpStatus.CONFLICT);
    }
    if (dto.parentId !== undefined) {
      await this.assertParentExists(dto.parentId);
    }
    const role = await this.prisma.role.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description ?? null,
        parentId: dto.parentId ?? null,
        isSystem: false,
      },
      include: ROLE_INCLUDE,
    });
    this.logger.log({ msg: 'role created', roleId: role.id, code: role.code });
    return toResponse(role, await this.permissions.loadRoleGraph());
  }

  async update(id: string, dto: UpdateRoleDto): Promise<RoleResponseDto> {
    const role = await this.findOrThrow(id);
    const graph = await this.permissions.loadRoleGraph();

    if (dto.parentId !== undefined && dto.parentId !== role.parentId) {
      if (dto.parentId !== null) {
        await this.assertParentExists(dto.parentId);
      }
      if (wouldCreateCycle(id, dto.parentId, graph)) {
        throw new AppException(
          ErrorCode.VALIDATION_FAILED,
          ROLES_MESSAGES.PARENT_CYCLE,
          HttpStatus.BAD_REQUEST,
        );
      }
      // A new parent changes what every holder of this role (and its children) can do.
      const affected = await this.permissions.userIdsWithRoles([
        ...collectDescendantRoleIds(id, graph),
      ]);
      await this.sod.assertNoConflict(affected, { roleParentId: new Map([[id, dto.parentId]]) });
    }

    const updated = await this.prisma.role.update({
      where: { id },
      data: {
        ...(dto.name === undefined ? {} : { name: dto.name }),
        ...(dto.description === undefined ? {} : { description: dto.description }),
        ...(dto.parentId === undefined ? {} : { parentId: dto.parentId }),
      },
      include: ROLE_INCLUDE,
    });
    return toResponse(updated, await this.permissions.loadRoleGraph());
  }

  /** Full replacement of direct permissions; SoD evaluated for every affected user first. */
  async setPermissions(id: string, codes: readonly PermissionCode[]): Promise<RoleResponseDto> {
    await this.findOrThrow(id);
    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: [...codes] } },
    });
    if (permissions.length !== codes.length) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        ROLES_MESSAGES.UNKNOWN_PERMISSION,
        HttpStatus.BAD_REQUEST,
      );
    }
    const graph = await this.permissions.loadRoleGraph();
    const affected = await this.permissions.userIdsWithRoles([
      ...collectDescendantRoleIds(id, graph),
    ]);
    await this.sod.assertNoConflict(affected, { rolePermissionCodes: new Map([[id, codes]]) });

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((permission) => ({ roleId: id, permissionId: permission.id })),
        });
      }
      return tx.role.findUniqueOrThrow({ where: { id }, include: ROLE_INCLUDE });
    });
    this.logger.log({
      msg: 'role permissions set',
      roleId: id,
      count: codes.length,
      affectedUsers: affected.length,
    });
    return toResponse(updated, await this.permissions.loadRoleGraph());
  }

  async delete(id: string): Promise<void> {
    const role = await this.findOrThrow(id);
    if (role.isSystem) {
      throw new AppException(
        ErrorCode.SYSTEM_ROLE_IMMUTABLE,
        ROLES_MESSAGES.SYSTEM_IMMUTABLE,
        HttpStatus.FORBIDDEN,
      );
    }
    if (role._count.users > 0 || role._count.children > 0) {
      throw new AppException(ErrorCode.CONFLICT, ROLES_MESSAGES.IN_USE, HttpStatus.CONFLICT, {
        users: role._count.users,
        children: role._count.children,
      });
    }
    await this.prisma.role.delete({ where: { id } });
    this.logger.log({ msg: 'role deleted', roleId: id, code: role.code });
  }

  private async assertParentExists(parentId: string): Promise<void> {
    if ((await this.prisma.role.findUnique({ where: { id: parentId } })) === null) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        ROLES_MESSAGES.PARENT_NOT_FOUND,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async findOrThrow(id: string): Promise<RoleWithPermissions> {
    const role = await this.prisma.role.findUnique({ where: { id }, include: ROLE_INCLUDE });
    if (role === null) {
      throw new AppException(ErrorCode.NOT_FOUND, ROLES_MESSAGES.NOT_FOUND, HttpStatus.NOT_FOUND, {
        id,
      });
    }
    return role;
  }
}

function toResponse(role: RoleWithPermissions, graph: RoleGraph): RoleResponseDto {
  return {
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description,
    parentId: role.parentId,
    isSystem: role.isSystem,
    permissionCodes: role.permissions.map((rp) => rp.permission.code as PermissionCode),
    inheritedPermissionCodes: [...resolveInheritedPermissions(role.id, graph)],
    userCount: role._count.users,
  };
}
