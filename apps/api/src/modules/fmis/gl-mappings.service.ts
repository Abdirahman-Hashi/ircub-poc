import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { ErrorCode } from '@ircub/shared';

import { AppException } from '../../common/errors/app.exception';
import { PrismaService } from '../../prisma/prisma.service';

import { FMIS_MESSAGES } from './fmis.messages';
import { resolveMapping, PRISMA_UNIQUE_VIOLATION } from './fmis.rules';
import { MAPPING_INCLUDE, toMappingView } from './fmis.view';

import type { CreateGlMappingDto } from './dto/create-gl-mapping.dto';
import type { GlMappingResponseDto } from './dto/gl-mapping.response.dto';
import type { GlMappingWithType } from './fmis.types';
import type { TransactionClient } from '../../prisma/prisma.types';
import type { Prisma } from '@prisma/client';

/**
 * Revenue type → GL code with effective dating (D17). The revenue type's own `glCode` is the
 * default the seed copies into the first mapping; from then on the mapping table is the
 * source of truth and a new row with a later `effectiveFrom` changes the GL without rewriting
 * history.
 */
@Injectable()
export class GlMappingsService {
  private readonly logger = new Logger(GlMappingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(revenueTypeId?: string): Promise<GlMappingResponseDto[]> {
    const rows = await this.prisma.glMapping.findMany({
      where: revenueTypeId === undefined ? {} : { revenueTypeId },
      orderBy: [{ revenueType: { code: 'asc' } }, { effectiveFrom: 'desc' }],
      include: MAPPING_INCLUDE,
    });
    return rows.map(toMappingView);
  }

  async create(dto: CreateGlMappingDto, actorId: string): Promise<GlMappingResponseDto> {
    const revenueType = await this.prisma.revenueType.findUnique({
      where: { id: dto.revenueTypeId },
    });
    if (revenueType === null) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        FMIS_MESSAGES.REVENUE_TYPE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }
    try {
      const created = await this.prisma.glMapping.create({
        data: {
          revenueTypeId: dto.revenueTypeId,
          glCode: dto.glCode,
          glName: dto.glName.trim(),
          effectiveFrom: new Date(dto.effectiveFrom),
          createdById: actorId,
        },
        include: MAPPING_INCLUDE,
      });
      this.logger.log({
        msg: 'gl mapping created',
        mappingId: created.id,
        revenueTypeId: dto.revenueTypeId,
        glCode: dto.glCode,
      });
      return toMappingView(created);
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new AppException(
          ErrorCode.CONFLICT,
          FMIS_MESSAGES.MAPPING_EXISTS,
          HttpStatus.CONFLICT,
          {
            revenueTypeId: dto.revenueTypeId,
            effectiveFrom: dto.effectiveFrom,
          },
        );
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.glMapping.findUnique({ where: { id } });
    if (existing === null) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        FMIS_MESSAGES.MAPPING_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        { id },
      );
    }
    await this.prisma.glMapping.delete({ where: { id } });
    this.logger.log({ msg: 'gl mapping deleted', mappingId: id });
  }

  /** Mapping in force for a revenue type on a date (latest `effectiveFrom` ≤ date). */
  async resolve(
    tx: TransactionClient | PrismaService,
    revenueTypeId: string,
    onDate: Date,
  ): Promise<GlMappingWithType> {
    const candidates = await tx.glMapping.findMany({
      where: { revenueTypeId },
      include: MAPPING_INCLUDE,
    });
    const mapping = resolveMapping(candidates, onDate);
    if (mapping === null) {
      throw new AppException(
        ErrorCode.GL_MAPPING_MISSING,
        FMIS_MESSAGES.MAPPING_MISSING,
        HttpStatus.UNPROCESSABLE_ENTITY,
        {
          revenueTypeId,
          onDate: onDate.toISOString(),
        },
      );
    }
    return mapping;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (error as Prisma.PrismaClientKnownRequestError | null)?.code === PRISMA_UNIQUE_VIOLATION;
  }
}
