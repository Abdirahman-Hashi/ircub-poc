import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { ErrorCode, type Paginated, UserStatus } from '@ircub/shared';

import { AppException } from '../../common/errors/app.exception';
import { parseSort, toPageSlice, toPaginated } from '../../common/pagination/pagination.rules';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { RefreshTokenService } from '../auth/refresh-token.service';
import { SodService } from '../sod/sod.service';

import { USERS_API } from './users.constants';
import { USERS_MESSAGES } from './users.messages';

import type { CreateUserDto } from './dto/create-user.dto';
import type { CreatedUserResponseDto } from './dto/created-user.response.dto';
import type { ResetPasswordResponseDto } from './dto/reset-password.response.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import type { UserFilterDto } from './dto/user-filter.dto';
import type { UserResponseDto } from './dto/user.response.dto';
import type { UserWithRoles } from './users.types';
import type { TransactionClient } from '../../prisma/prisma.types';
import type { Prisma } from '@prisma/client';

const USER_INCLUDE = {
  roles: { include: { role: { select: { id: true, code: true, name: true } } } },
} as const;

/** Admin user management (brief Module 1). Every mutation is audited by the Prisma extension. */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly refreshTokens: RefreshTokenService,
    private readonly sod: SodService,
  ) {}

  async list(filter: UserFilterDto): Promise<Paginated<UserResponseDto>> {
    const where: Prisma.UserWhereInput = {
      ...(filter.status === undefined ? {} : { status: filter.status }),
      ...(filter.roleId === undefined ? {} : { roles: { some: { roleId: filter.roleId } } }),
      ...(filter.search === undefined
        ? {}
        : {
            OR: [
              { email: { contains: filter.search, mode: 'insensitive' } },
              { fullName: { contains: filter.search, mode: 'insensitive' } },
            ],
          }),
    };
    const sort = parseSort(filter.sort, USERS_API.SORTABLE, {
      field: 'createdAt',
      direction: 'desc',
    });
    const { skip, take } = toPageSlice(filter.page, filter.pageSize);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { [sort.field]: sort.direction },
        include: USER_INCLUDE,
      }),
      this.prisma.user.count({ where }),
    ]);
    return toPaginated(rows.map(toResponse), total, filter.page, filter.pageSize);
  }

  async get(id: string): Promise<UserResponseDto> {
    return toResponse(await this.findOrThrow(id));
  }

  async create(dto: CreateUserDto): Promise<CreatedUserResponseDto> {
    const email = dto.email.trim().toLowerCase();
    if ((await this.prisma.user.findUnique({ where: { email } })) !== null) {
      throw new AppException(ErrorCode.CONFLICT, USERS_MESSAGES.EMAIL_TAKEN, HttpStatus.CONFLICT);
    }
    await this.assertRolesExist(dto.roleIds);
    const temporaryPassword = this.passwords.generateTemporary();
    const passwordHash = await this.passwords.hash(temporaryPassword);

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { email, fullName: dto.fullName, passwordHash } });
      await tx.passwordHistory.create({ data: { userId: user.id, passwordHash } });
      // New user has no roles yet, so SoD is evaluated against the proposed set only.
      await this.sod.assertNoConflict([user.id], {
        userRoleIds: new Map([[user.id, dto.roleIds]]),
      });
      await this.replaceRoles(tx, user.id, dto.roleIds);
      return tx.user.findUniqueOrThrow({ where: { id: user.id }, include: USER_INCLUDE });
    });
    this.logger.log({ msg: 'user created', userId: created.id, roles: dto.roleIds.length });
    return Object.assign(toResponse(created), { temporaryPassword });
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    await this.findOrThrow(id);
    const email = dto.email?.trim().toLowerCase();
    if (email !== undefined) {
      const clash = await this.prisma.user.findUnique({ where: { email } });
      if (clash !== null && clash.id !== id) {
        throw new AppException(ErrorCode.CONFLICT, USERS_MESSAGES.EMAIL_TAKEN, HttpStatus.CONFLICT);
      }
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(email === undefined ? {} : { email }),
        ...(dto.fullName === undefined ? {} : { fullName: dto.fullName }),
      },
      include: USER_INCLUDE,
    });
    return toResponse(updated);
  }

  /**
   * Full replacement of a user's roles; rejected with SOD_VIOLATION before any write. The
   * SoD check runs under the user's row lock so two concurrent assignments serialise instead
   * of both passing a check against the same stale state.
   */
  async setRoles(id: string, roleIds: readonly string[]): Promise<UserResponseDto> {
    await this.findOrThrow(id);
    await this.assertRolesExist(roleIds);
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "user" WHERE id = ${id}::uuid FOR UPDATE`;
      await this.sod.assertNoConflict([id], { userRoleIds: new Map([[id, roleIds]]) });
      await this.replaceRoles(tx, id, roleIds);
      return tx.user.findUniqueOrThrow({ where: { id }, include: USER_INCLUDE });
    });
    this.logger.log({ msg: 'user roles set', userId: id, roles: roleIds.length });
    return toResponse(updated);
  }

  async deactivate(id: string, actorId: string): Promise<UserResponseDto> {
    if (id === actorId) {
      throw new AppException(
        ErrorCode.CONFLICT,
        USERS_MESSAGES.SELF_DEACTIVATE,
        HttpStatus.CONFLICT,
      );
    }
    await this.findOrThrow(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.DEACTIVATED },
      include: USER_INCLUDE,
    });
    await this.refreshTokens.revokeAll(id);
    this.logger.log({ msg: 'user deactivated', userId: id });
    return toResponse(updated);
  }

  async reactivate(id: string): Promise<UserResponseDto> {
    await this.findOrThrow(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.ACTIVE, failedLoginCount: 0, lockedUntil: null },
      include: USER_INCLUDE,
    });
    return toResponse(updated);
  }

  async resetPassword(id: string): Promise<ResetPasswordResponseDto> {
    await this.findOrThrow(id);
    const temporaryPassword = this.passwords.generateTemporary();
    await this.prisma.$transaction(async (tx) => {
      await this.passwords.setPassword(tx, id, temporaryPassword);
      await tx.user.update({ where: { id }, data: { failedLoginCount: 0, lockedUntil: null } });
    });
    await this.refreshTokens.revokeAll(id);
    this.logger.log({ msg: 'password reset by admin', userId: id });
    return { temporaryPassword };
  }

  private async replaceRoles(
    tx: TransactionClient,
    userId: string,
    roleIds: readonly string[],
  ): Promise<void> {
    await tx.userRole.deleteMany({ where: { userId } });
    if (roleIds.length > 0) {
      await tx.userRole.createMany({ data: roleIds.map((roleId) => ({ userId, roleId })) });
    }
  }

  private async assertRolesExist(roleIds: readonly string[]): Promise<void> {
    if (roleIds.length === 0) {
      return;
    }
    const count = await this.prisma.role.count({ where: { id: { in: [...roleIds] } } });
    if (count !== roleIds.length) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        USERS_MESSAGES.UNKNOWN_ROLE,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async findOrThrow(id: string): Promise<UserWithRoles> {
    const user = await this.prisma.user.findUnique({ where: { id }, include: USER_INCLUDE });
    if (user === null) {
      throw new AppException(ErrorCode.NOT_FOUND, USERS_MESSAGES.NOT_FOUND, HttpStatus.NOT_FOUND, {
        id,
      });
    }
    return user;
  }
}

function toResponse(user: UserWithRoles): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    status: user.status,
    mfaEnabled: user.mfaEnabled,
    lockedUntil: user.lockedUntil,
    roles: user.roles.map((membership) => membership.role),
    createdAt: user.createdAt,
  };
}
