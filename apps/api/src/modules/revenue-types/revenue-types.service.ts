import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { ErrorCode } from '@ircub/shared';

import { AppException } from '../../common/errors/app.exception';
import { PrismaService } from '../../prisma/prisma.service';

import { REVENUE_TYPES_MESSAGES } from './revenue-types.messages';
import { toRevenueTypeView } from './revenue-types.view';

import type { CreateRevenueTypeDto } from './dto/create-revenue-type.dto';
import type { RevenueTypeResponseDto } from './dto/revenue-type.response.dto';
import type { UpdateRevenueTypeDto } from './dto/update-revenue-type.dto';
import type { RevenueType } from '@prisma/client';

/** Revenue type catalogue (brief Module 3): rate rules and the GL code each type posts to. */
@Injectable()
export class RevenueTypesService {
  private readonly logger = new Logger(RevenueTypesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(includeInactive: boolean): Promise<RevenueTypeResponseDto[]> {
    const rows = await this.prisma.revenueType.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: { name: 'asc' },
    });
    return rows.map(toRevenueTypeView);
  }

  async get(id: string): Promise<RevenueTypeResponseDto> {
    return toRevenueTypeView(await this.findOrThrow(id));
  }

  async create(dto: CreateRevenueTypeDto): Promise<RevenueTypeResponseDto> {
    if ((await this.prisma.revenueType.findUnique({ where: { code: dto.code } })) !== null) {
      throw new AppException(
        ErrorCode.CONFLICT,
        REVENUE_TYPES_MESSAGES.CODE_TAKEN,
        HttpStatus.CONFLICT,
      );
    }
    const row = await this.prisma.revenueType.create({
      data: {
        code: dto.code,
        name: dto.name,
        rateType: dto.rateType,
        rate: dto.rate,
        glCode: dto.glCode,
        description: dto.description ?? null,
      },
    });
    this.logger.log({ msg: 'revenue type created', revenueTypeId: row.id, code: row.code });
    return toRevenueTypeView(row);
  }

  async update(id: string, dto: UpdateRevenueTypeDto): Promise<RevenueTypeResponseDto> {
    await this.findOrThrow(id);
    const row = await this.prisma.revenueType.update({
      where: { id },
      data: {
        ...(dto.name === undefined ? {} : { name: dto.name }),
        ...(dto.rateType === undefined ? {} : { rateType: dto.rateType }),
        ...(dto.rate === undefined ? {} : { rate: dto.rate }),
        ...(dto.glCode === undefined ? {} : { glCode: dto.glCode }),
        ...(dto.description === undefined ? {} : { description: dto.description }),
        ...(dto.active === undefined ? {} : { active: dto.active }),
      },
    });
    return toRevenueTypeView(row);
  }

  /**
   * Deletes when nothing references it; otherwise deactivates so history (assessments, GL
   * mappings, journal lines, summaries, targets) keeps its type.
   */
  async remove(id: string): Promise<RevenueTypeResponseDto | null> {
    await this.findOrThrow(id);
    const usage = await this.prisma.revenueType.findUniqueOrThrow({
      where: { id },
      select: {
        _count: {
          select: {
            assessments: true,
            glMappings: true,
            journalLines: true,
            dailyCollectionSummaries: true,
            revenueTargets: true,
          },
        },
      },
    });
    const references = Object.values(usage._count).reduce((sum, count) => sum + count, 0);
    if (references > 0) {
      const row = await this.prisma.revenueType.update({ where: { id }, data: { active: false } });
      this.logger.log({
        msg: 'revenue type deactivated (in use)',
        revenueTypeId: id,
        references: usage._count,
      });
      return toRevenueTypeView(row);
    }
    await this.prisma.revenueType.delete({ where: { id } });
    return null;
  }

  async getActiveOrThrow(id: string): Promise<RevenueType> {
    const row = await this.findOrThrow(id);
    if (!row.active) {
      throw new AppException(
        ErrorCode.REVENUE_TYPE_INACTIVE,
        REVENUE_TYPES_MESSAGES.INACTIVE,
        HttpStatus.CONFLICT,
        { id },
      );
    }
    return row;
  }

  private async findOrThrow(id: string): Promise<RevenueType> {
    const row = await this.prisma.revenueType.findUnique({ where: { id } });
    if (row === null) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        REVENUE_TYPES_MESSAGES.NOT_FOUND,
        HttpStatus.NOT_FOUND,
        { id },
      );
    }
    return row;
  }
}
