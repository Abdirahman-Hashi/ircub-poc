import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { ErrorCode, MeterStatus } from '@ircub/shared';

import { AppException } from '../../../common/errors/app.exception';
import { PrismaService } from '../../../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { WATER_MESSAGES } from '../water.messages';
import { METER_INCLUDE, toMeterView } from '../water.view';

import type { MeterWithLatest } from '../water-views.types';
import type { InstallMeterDto } from './dto/install-meter.dto';
import type { MeterResponseDto } from './dto/meter.response.dto';
import type { ReplaceMeterDto } from './dto/replace-meter.dto';
import type { Prisma } from '@prisma/client';

/** Meters per account; replacement links old and new so the first new reading uses `initialReading` (D13). */
@Injectable()
export class MetersService {
  private readonly logger = new Logger(MetersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
  ) {}

  async install(dto: InstallMeterDto): Promise<MeterResponseDto> {
    await this.accounts.assertActive(dto.accountId);
    await this.assertSerialFree(dto.serial);
    const row = await this.prisma.meter.create({
      data: {
        accountId: dto.accountId,
        serial: dto.serial.trim(),
        ...(dto.maxDigits === undefined ? {} : { maxDigits: dto.maxDigits }),
        ...(dto.initialReading === undefined ? {} : { initialReading: dto.initialReading }),
        ...(dto.installedAt === undefined ? {} : { installedAt: dto.installedAt }),
      },
      include: METER_INCLUDE,
    });
    this.logger.log({
      msg: 'meter installed',
      meterId: row.id,
      serial: row.serial,
      accountId: row.accountId,
    });
    return toMeterView(row);
  }

  /** Old meter → REPLACED; new meter on the same account carries `replacesMeterId`. */
  async replace(id: string, dto: ReplaceMeterDto): Promise<MeterResponseDto> {
    const old = await this.findOrThrow(id);
    if (old.status === MeterStatus.REPLACED) {
      throw new AppException(
        ErrorCode.METER_ALREADY_REPLACED,
        WATER_MESSAGES.METER_ALREADY_REPLACED,
        HttpStatus.CONFLICT,
        { id },
      );
    }
    await this.assertSerialFree(dto.newSerial);
    const created = await this.prisma.$transaction(async (tx) => {
      await tx.meter.update({ where: { id }, data: { status: MeterStatus.REPLACED } });
      return tx.meter.create({
        data: {
          accountId: old.accountId,
          serial: dto.newSerial.trim(),
          maxDigits: dto.maxDigits ?? old.maxDigits,
          initialReading: dto.initialReading,
          installedAt: dto.installedAt ?? new Date(),
          replacesMeterId: old.id,
        },
        include: METER_INCLUDE,
      });
    });
    this.logger.log({
      msg: 'meter replaced',
      oldMeterId: old.id,
      newMeterId: created.id,
      accountId: old.accountId,
    });
    return toMeterView(created);
  }

  async get(id: string): Promise<MeterResponseDto> {
    return toMeterView(await this.findOrThrow(id));
  }

  async findOrThrow(id: string): Promise<MeterWithLatest> {
    const row = await this.prisma.meter.findUnique({ where: { id }, include: METER_INCLUDE });
    if (row === null) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        WATER_MESSAGES.METER_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        { id },
      );
    }
    return row;
  }

  async findBySerial(serial: string): Promise<MeterWithLatest | null> {
    return this.prisma.meter.findUnique({
      where: { serial: serial.trim() },
      include: METER_INCLUDE,
    });
  }

  async findManyBySerial(serials: readonly string[]): Promise<MeterWithLatest[]> {
    const where: Prisma.MeterWhereInput = { serial: { in: [...serials] } };
    return this.prisma.meter.findMany({ where, include: METER_INCLUDE });
  }

  private async assertSerialFree(serial: string): Promise<void> {
    if ((await this.prisma.meter.findUnique({ where: { serial: serial.trim() } })) !== null) {
      throw new AppException(
        ErrorCode.CONFLICT,
        WATER_MESSAGES.METER_SERIAL_TAKEN,
        HttpStatus.CONFLICT,
        { serial },
      );
    }
  }
}
