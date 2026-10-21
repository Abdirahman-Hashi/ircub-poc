import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { ErrorCode, type PermissionCode } from '@ircub/shared';

import { AppException } from '../../common/errors/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';

import { SOD_MESSAGES } from './sod.messages';
import { findConflicts, normalisePair } from './sod.rules';

import type { PermissionOverrides } from '../permissions/permissions.types';
import type { CreateSodRuleDto } from './dto/create-sod-rule.dto';
import type { SodRuleResponseDto } from './dto/sod-rule.response.dto';
import type { SodConflict, SodRulePair } from './sod.types';
import type { SodRule } from '@prisma/client';

/**
 * Configurable segregation of duties (D7). `assertNoConflict` is the single enforcement
 * point: both assignment paths (user ← roles, role ← permissions/parent) call it with the
 * proposed change so a violation is rejected before anything is written.
 */
@Injectable()
export class SodService {
  private readonly logger = new Logger(SodService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
  ) {}

  async list(): Promise<SodRuleResponseDto[]> {
    const rules = await this.prisma.sodRule.findMany({ orderBy: { createdAt: 'asc' } });
    return rules.map(toResponse);
  }

  async create(dto: CreateSodRuleDto): Promise<SodRuleResponseDto> {
    if (dto.permissionACode === dto.permissionBCode) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        SOD_MESSAGES.SAME_PERMISSION,
        HttpStatus.BAD_REQUEST,
      );
    }
    const [permissionACode, permissionBCode] = normalisePair(
      dto.permissionACode,
      dto.permissionBCode,
    );
    const existing = await this.prisma.sodRule.findUnique({
      where: { permissionACode_permissionBCode: { permissionACode, permissionBCode } },
    });
    if (existing !== null) {
      throw new AppException(ErrorCode.CONFLICT, SOD_MESSAGES.DUPLICATE, HttpStatus.CONFLICT);
    }
    // A rule nobody can satisfy today is a configuration error, not a silent exception.
    const violators = await this.findViolatorsOf({
      permissionACode,
      permissionBCode,
      description: dto.description,
    });
    if (violators.length > 0) {
      throw new AppException(
        ErrorCode.SOD_VIOLATION,
        SOD_MESSAGES.EXISTING_VIOLATIONS,
        HttpStatus.CONFLICT,
        {
          conflicts: violators,
        },
      );
    }
    const rule = await this.prisma.sodRule.create({
      data: { permissionACode, permissionBCode, description: dto.description },
    });
    this.logger.log({ msg: 'sod rule created', ruleId: rule.id, permissionACode, permissionBCode });
    return toResponse(rule);
  }

  async delete(id: string): Promise<void> {
    const rule = await this.prisma.sodRule.findUnique({ where: { id } });
    if (rule === null) {
      throw new AppException(ErrorCode.NOT_FOUND, SOD_MESSAGES.NOT_FOUND, HttpStatus.NOT_FOUND, {
        id,
      });
    }
    await this.prisma.sodRule.delete({ where: { id } });
    this.logger.log({ msg: 'sod rule deleted', ruleId: id });
  }

  /**
   * Throws SOD_VIOLATION if any of the users would hold both sides of any rule once the
   * proposed overrides are applied. Called by UsersService.setRoles/create and
   * RolesService.setPermissions/update.
   */
  async assertNoConflict(
    userIds: readonly string[],
    overrides: PermissionOverrides = {},
  ): Promise<void> {
    if (userIds.length === 0) {
      return;
    }
    const rules = await this.loadRules();
    if (rules.length === 0) {
      return;
    }
    const effective = await this.permissions.resolveForUsers(userIds, overrides);
    const conflicts: SodConflict[] = [];
    for (const [userId, held] of effective) {
      conflicts.push(...findConflicts(userId, held, rules));
    }
    if (conflicts.length > 0) {
      this.logger.warn({ msg: 'sod violation rejected', conflicts });
      throw new AppException(
        ErrorCode.SOD_VIOLATION,
        SOD_MESSAGES.VIOLATION,
        HttpStatus.FORBIDDEN,
        { conflicts },
      );
    }
  }

  private async findViolatorsOf(rule: SodRulePair): Promise<SodConflict[]> {
    const memberships = await this.prisma.userRole.findMany({
      select: { userId: true },
      distinct: ['userId'],
    });
    const userIds = memberships.map((row) => row.userId);
    const effective = await this.permissions.resolveForUsers(userIds);
    const conflicts: SodConflict[] = [];
    for (const [userId, held] of effective) {
      conflicts.push(...findConflicts(userId, held, [rule]));
    }
    return conflicts;
  }

  private async loadRules(): Promise<SodRulePair[]> {
    const rules = await this.prisma.sodRule.findMany();
    return rules.map((rule) => ({
      permissionACode: rule.permissionACode as PermissionCode,
      permissionBCode: rule.permissionBCode as PermissionCode,
      description: rule.description,
    }));
  }
}

function toResponse(rule: SodRule): SodRuleResponseDto {
  return {
    id: rule.id,
    permissionACode: rule.permissionACode as PermissionCode,
    permissionBCode: rule.permissionBCode as PermissionCode,
    description: rule.description,
    createdAt: rule.createdAt,
  };
}
