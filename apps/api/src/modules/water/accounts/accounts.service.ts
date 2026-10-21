import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { ErrorCode, type Paginated, WaterAccountStatus } from '@ircub/shared';

import { AppException } from '../../../common/errors/app.exception';
import { IdsService } from '../../../common/ids/ids.service';
import { parseSort, toPageSlice, toPaginated } from '../../../common/pagination/pagination.rules';
import { PrismaService } from '../../../prisma/prisma.service';
import { PayersService } from '../../payers/payers.service';
import { TariffsService } from '../tariffs/tariffs.service';
import { WATER_MESSAGES } from '../water.messages';
import { ACCOUNT_INCLUDE, toAccountView } from '../water.view';

import { ACCOUNTS_API } from './accounts.constants';

import type { WaterAccountWithRelations } from '../water-views.types';
import type { CreateWaterAccountDto } from './dto/create-water-account.dto';
import type { WaterAccountFilterDto } from './dto/water-account-filter.dto';
import type { WaterAccountResponseDto } from './dto/water-account.response.dto';
import type { Prisma } from '@prisma/client';

/** Water accounts (brief Module 4): one payer, one tariff category, one or more meters over time. */
@Injectable()
export class AccountsService {
  private readonly logger = new Logger(AccountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdsService,
    private readonly payers: PayersService,
    private readonly tariffs: TariffsService,
  ) {}

  async create(dto: CreateWaterAccountDto): Promise<WaterAccountResponseDto> {
    const payer = await this.payers.assertActive(dto.payerId);
    const tariff = await this.tariffs.findOrThrow(dto.tariffCategoryId);
    if (
      dto.meterSerial !== undefined &&
      (await this.prisma.meter.findUnique({ where: { serial: dto.meterSerial } })) !== null
    ) {
      throw new AppException(
        ErrorCode.CONFLICT,
        WATER_MESSAGES.METER_SERIAL_TAKEN,
        HttpStatus.CONFLICT,
        { serial: dto.meterSerial },
      );
    }
    const accountNumber = await this.ids.generateWaterAccountNumber();
    const row = await this.prisma.waterAccount.create({
      data: {
        accountNumber,
        payerId: payer.id,
        tariffCategoryId: tariff.id,
        serviceAddress: dto.serviceAddress.trim(),
        ...(dto.meterSerial === undefined
          ? {}
          : {
              meters: {
                create: {
                  serial: dto.meterSerial.trim(),
                  ...(dto.maxDigits === undefined ? {} : { maxDigits: dto.maxDigits }),
                  ...(dto.initialReading === undefined
                    ? {}
                    : { initialReading: dto.initialReading }),
                },
              },
            }),
      },
      include: ACCOUNT_INCLUDE,
    });
    this.logger.log({
      msg: 'water account opened',
      accountId: row.id,
      accountNumber,
      payerId: payer.id,
    });
    return toAccountView(row);
  }

  async list(filter: WaterAccountFilterDto): Promise<Paginated<WaterAccountResponseDto>> {
    const where: Prisma.WaterAccountWhereInput = {
      ...(filter.payerId === undefined ? {} : { payerId: filter.payerId }),
      ...(filter.tariffCategoryId === undefined
        ? {}
        : { tariffCategoryId: filter.tariffCategoryId }),
      ...(filter.status === undefined ? {} : { status: filter.status }),
      ...(filter.search === undefined
        ? {}
        : {
            OR: [
              { accountNumber: { contains: filter.search.toUpperCase() } },
              { payer: { name: { contains: filter.search, mode: 'insensitive' } } },
              { payer: { tin: { contains: filter.search.toUpperCase() } } },
              { meters: { some: { serial: { contains: filter.search, mode: 'insensitive' } } } },
            ],
          }),
    };
    const sort = parseSort(filter.sort, ACCOUNTS_API.SORTABLE, {
      field: 'openedAt',
      direction: 'desc',
    });
    const { skip, take } = toPageSlice(filter.page, filter.pageSize);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.waterAccount.findMany({
        where,
        skip,
        take,
        orderBy: { [sort.field]: sort.direction },
        include: ACCOUNT_INCLUDE,
      }),
      this.prisma.waterAccount.count({ where }),
    ]);
    return toPaginated(rows.map(toAccountView), total, filter.page, filter.pageSize);
  }

  async get(id: string): Promise<WaterAccountResponseDto> {
    return toAccountView(await this.findOrThrow(id));
  }

  async listForPayer(payerId: string): Promise<WaterAccountResponseDto[]> {
    const rows = await this.prisma.waterAccount.findMany({
      where: { payerId },
      include: ACCOUNT_INCLUDE,
      orderBy: { openedAt: 'asc' },
    });
    return rows.map(toAccountView);
  }

  async setStatus(id: string, status: WaterAccountStatus): Promise<WaterAccountResponseDto> {
    await this.findOrThrow(id);
    const row = await this.prisma.waterAccount.update({
      where: { id },
      data: { status },
      include: ACCOUNT_INCLUDE,
    });
    this.logger.log({ msg: 'water account status changed', accountId: id, status });
    return toAccountView(row);
  }

  async findOrThrow(id: string): Promise<WaterAccountWithRelations> {
    const row = await this.prisma.waterAccount.findUnique({
      where: { id },
      include: ACCOUNT_INCLUDE,
    });
    if (row === null) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        WATER_MESSAGES.ACCOUNT_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        { id },
      );
    }
    return row;
  }

  async assertActive(id: string): Promise<WaterAccountWithRelations> {
    const row = await this.findOrThrow(id);
    if (row.status !== WaterAccountStatus.ACTIVE) {
      throw new AppException(
        ErrorCode.ACCOUNT_NOT_ACTIVE,
        WATER_MESSAGES.ACCOUNT_NOT_ACTIVE,
        HttpStatus.CONFLICT,
        { id },
      );
    }
    return row;
  }
}
