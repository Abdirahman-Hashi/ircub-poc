import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { ErrorCode } from '@ircub/shared';

import { AppException } from '../../../common/errors/app.exception';
import { PrismaService } from '../../../prisma/prisma.service';
import { WATER_MESSAGES } from '../water.messages';
import { TARIFF_INCLUDE, toTariffView } from '../water.view';

import { validateTiers } from './tariffs.rules';

import type { TariffWithTiers } from '../water-views.types';
import type { CreateTariffCategoryDto } from './dto/create-tariff-category.dto';
import type { TariffCategoryResponseDto } from './dto/tariff-category.response.dto';
import type { TariffTierDto } from './dto/tariff-tier.dto';
import type { UpdateTariffCategoryDto } from './dto/update-tariff-category.dto';

/** Tariff categories and their tier bands (D14). Tier sets are replaced atomically. */
@Injectable()
export class TariffsService {
  private readonly logger = new Logger(TariffsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(includeInactive: boolean): Promise<TariffCategoryResponseDto[]> {
    const rows = await this.prisma.tariffCategory.findMany({
      where: includeInactive ? {} : { active: true },
      include: TARIFF_INCLUDE,
      orderBy: { code: 'asc' },
    });
    return rows.map(toTariffView);
  }

  async get(id: string): Promise<TariffCategoryResponseDto> {
    return toTariffView(await this.findOrThrow(id));
  }

  async create(dto: CreateTariffCategoryDto): Promise<TariffCategoryResponseDto> {
    this.assertTiers(dto.tiers);
    if ((await this.prisma.tariffCategory.findUnique({ where: { code: dto.code } })) !== null) {
      throw new AppException(
        ErrorCode.CONFLICT,
        WATER_MESSAGES.TARIFF_CODE_TAKEN,
        HttpStatus.CONFLICT,
      );
    }
    const row = await this.prisma.tariffCategory.create({
      data: {
        code: dto.code,
        name: dto.name,
        fixedCharge: dto.fixedCharge,
        tiers: { create: dto.tiers },
      },
      include: TARIFF_INCLUDE,
    });
    this.logger.log({
      msg: 'tariff category created',
      tariffId: row.id,
      code: row.code,
      tiers: row.tiers.length,
    });
    return toTariffView(row);
  }

  async update(id: string, dto: UpdateTariffCategoryDto): Promise<TariffCategoryResponseDto> {
    await this.findOrThrow(id);
    if (dto.tiers !== undefined) {
      this.assertTiers(dto.tiers);
    }
    const row = await this.prisma.$transaction(async (tx) => {
      if (dto.tiers !== undefined) {
        await tx.tariffTier.deleteMany({ where: { categoryId: id } });
        await tx.tariffTier.createMany({
          data: dto.tiers.map((tier) => ({
            fromUnit: tier.fromUnit,
            toUnit: tier.toUnit,
            ratePerUnit: tier.ratePerUnit,
            categoryId: id,
          })),
        });
      }
      return tx.tariffCategory.update({
        where: { id },
        data: {
          ...(dto.name === undefined ? {} : { name: dto.name }),
          ...(dto.fixedCharge === undefined ? {} : { fixedCharge: dto.fixedCharge }),
          ...(dto.active === undefined ? {} : { active: dto.active }),
        },
        include: TARIFF_INCLUDE,
      });
    });
    return toTariffView(row);
  }

  async findOrThrow(id: string): Promise<TariffWithTiers> {
    const row = await this.prisma.tariffCategory.findUnique({
      where: { id },
      include: TARIFF_INCLUDE,
    });
    if (row === null) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        WATER_MESSAGES.TARIFF_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        { id },
      );
    }
    return row;
  }

  private assertTiers(tiers: readonly TariffTierDto[]): void {
    const errors = validateTiers(tiers);
    if (errors.length > 0) {
      throw new AppException(
        ErrorCode.TARIFF_TIERS_INVALID,
        WATER_MESSAGES.TARIFF_TIERS_INVALID,
        HttpStatus.BAD_REQUEST,
        { errors },
      );
    }
  }
}
