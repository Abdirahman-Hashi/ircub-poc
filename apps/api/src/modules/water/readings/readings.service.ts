import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { startOfDay, subMonths } from 'date-fns';

import { ErrorCode, MeterStatus, type Paginated, ReadingSource, ReadingType } from '@ircub/shared';

import { AppException } from '../../../common/errors/app.exception';
import { parseSort, toPageSlice, toPaginated } from '../../../common/pagination/pagination.rules';
import { PrismaService } from '../../../prisma/prisma.service';
import { SystemConfigKey } from '../../system-config/system-config.keys';
import { SystemConfigService } from '../../system-config/system-config.service';
import { MetersService } from '../meters/meters.service';
import { WATER_MESSAGES } from '../water.messages';
import { READING_INCLUDE, toReadingView } from '../water.view';

import { READINGS_API } from './readings.constants';
import { computeConsumption, evaluateAbnormal } from './readings.rules';

import type { MeterWithLatest, ReadingWithMeter } from '../water-views.types';
import type { CreateReadingDto } from './dto/create-reading.dto';
import type { MeterReadingResponseDto } from './dto/meter-reading.response.dto';
import type { ReadingFilterDto } from './dto/reading-filter.dto';
import type { ReadingPreviewResponseDto } from './dto/reading-preview.response.dto';
import type { PreviousReadingState, RecordReadingInput } from './readings.types';
import type { TransactionClient } from '../../../prisma/prisma.types';
import type { Prisma } from '@prisma/client';

/** Meter readings with the D13 rules; `recordReading` is shared by single capture and the CSV importer. */
@Injectable()
export class ReadingsService {
  private readonly logger = new Logger(ReadingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly meters: MetersService,
    private readonly systemConfig: SystemConfigService,
  ) {}

  async preview(dto: CreateReadingDto): Promise<ReadingPreviewResponseDto> {
    const meter = await this.meters.findOrThrow(dto.meterId);
    const previous = previousOf(meter);
    this.assertDate(dto.readingDate, previous.date, new Date());
    const consumption = this.consumptionOrThrow(
      meter,
      previous.value,
      dto.readingValue,
      dto.type ?? ReadingType.NORMAL,
    );
    const abnormal = await this.abnormalFor(meter, consumption, dto.readingDate);
    return {
      meterId: meter.id,
      previousReading: previous.value,
      previousDate: previous.date,
      consumption,
      abnormal: abnormal.abnormal,
      abnormalReason: abnormal.reason,
    };
  }

  async create(dto: CreateReadingDto, actorId: string): Promise<MeterReadingResponseDto> {
    const meter = await this.meters.findOrThrow(dto.meterId);
    const row = await this.prisma.$transaction((tx) =>
      this.recordReading(tx, {
        meter,
        readingDate: dto.readingDate,
        readingValue: dto.readingValue,
        type: dto.type ?? ReadingType.NORMAL,
        source: ReadingSource.MANUAL,
        capturedById: actorId,
        bulkUploadId: null,
      }),
    );
    return toReadingView(row);
  }

  /**
   * Validates against the meter's latest reading, computes consumption and the abnormal flag,
   * and inserts the row. Throws `READING_BELOW_PREVIOUS`, `READING_DUPLICATE_DATE`, etc.
   */
  async recordReading(tx: TransactionClient, input: RecordReadingInput): Promise<ReadingWithMeter> {
    if (input.meter.status !== MeterStatus.ACTIVE) {
      throw new AppException(
        ErrorCode.METER_NOT_ACTIVE,
        WATER_MESSAGES.METER_NOT_ACTIVE,
        HttpStatus.CONFLICT,
        { meterId: input.meter.id },
      );
    }
    const latest = await tx.meterReading.findFirst({
      where: { meterId: input.meter.id },
      orderBy: [{ readingDate: 'desc' }, { createdAt: 'desc' }],
    });
    const previous: PreviousReadingState =
      latest === null
        ? { value: input.meter.initialReading, date: null }
        : { value: latest.readingValue, date: latest.readingDate };
    const readingDate = startOfDay(input.readingDate);
    this.assertDate(readingDate, previous.date, new Date());
    const duplicate = await tx.meterReading.findUnique({
      where: { meterId_readingDate: { meterId: input.meter.id, readingDate } },
    });
    if (duplicate !== null) {
      throw new AppException(
        ErrorCode.READING_DUPLICATE_DATE,
        WATER_MESSAGES.READING_DUPLICATE_DATE,
        HttpStatus.CONFLICT,
        { meterId: input.meter.id, readingDate },
      );
    }
    const consumption = this.consumptionOrThrow(
      input.meter,
      previous.value,
      input.readingValue,
      input.type,
    );
    const abnormal = await this.abnormalFor(input.meter, consumption, readingDate);
    const row = await tx.meterReading.create({
      data: {
        meterId: input.meter.id,
        readingDate,
        readingValue: input.readingValue,
        type: input.type,
        consumption,
        source: input.source,
        capturedById: input.capturedById,
        bulkUploadId: input.bulkUploadId,
        abnormal: abnormal.abnormal,
        abnormalReason: abnormal.reason,
      },
      include: READING_INCLUDE,
    });
    this.logger.log({
      msg: 'reading recorded',
      readingId: row.id,
      meterId: input.meter.id,
      consumption,
      abnormal: abnormal.abnormal,
    });
    return row;
  }

  async list(filter: ReadingFilterDto): Promise<Paginated<MeterReadingResponseDto>> {
    const where: Prisma.MeterReadingWhereInput = {
      ...(filter.meterId === undefined ? {} : { meterId: filter.meterId }),
      ...(filter.accountId === undefined ? {} : { meter: { accountId: filter.accountId } }),
      ...(filter.abnormal === undefined ? {} : { abnormal: filter.abnormal }),
      ...(filter.source === undefined ? {} : { source: filter.source }),
      ...(filter.dateFrom === undefined && filter.dateTo === undefined
        ? {}
        : {
            readingDate: {
              ...(filter.dateFrom === undefined ? {} : { gte: filter.dateFrom }),
              ...(filter.dateTo === undefined ? {} : { lte: filter.dateTo }),
            },
          }),
    };
    const sort = parseSort(filter.sort, READINGS_API.SORTABLE, {
      field: 'readingDate',
      direction: 'desc',
    });
    const { skip, take } = toPageSlice(filter.page, filter.pageSize);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.meterReading.findMany({
        where,
        skip,
        take,
        orderBy: { [sort.field]: sort.direction },
        include: READING_INCLUDE,
      }),
      this.prisma.meterReading.count({ where }),
    ]);
    return toPaginated(rows.map(toReadingView), total, filter.page, filter.pageSize);
  }

  /** Monthly consumption history for the abnormal check (D13): previous N months on this meter chain. */
  private async abnormalFor(
    meter: MeterWithLatest,
    consumption: number,
    readingDate: Date,
  ): Promise<{ abnormal: boolean; reason: string | null }> {
    const [thresholdPct, months] = await Promise.all([
      this.systemConfig.get(SystemConfigKey.ABNORMAL_CONSUMPTION_THRESHOLD_PCT),
      this.systemConfig.get(SystemConfigKey.ABNORMAL_CONSUMPTION_HISTORY_MONTHS),
    ]);
    const meterIds = [meter.id, ...(meter.replacesMeterId === null ? [] : [meter.replacesMeterId])];
    const history = await this.prisma.meterReading.findMany({
      where: {
        meterId: { in: meterIds },
        readingDate: { lt: readingDate, gte: subMonths(readingDate, months) },
      },
      orderBy: { readingDate: 'desc' },
      take: months,
      select: { consumption: true },
    });
    const result = evaluateAbnormal(
      consumption,
      history.map((row) => row.consumption),
      thresholdPct,
      months,
    );
    return { abnormal: result.abnormal, reason: result.reason };
  }

  private consumptionOrThrow(
    meter: MeterWithLatest,
    previous: number,
    current: number,
    type: ReadingType,
  ): number {
    const result = computeConsumption({
      previousReading: previous,
      currentReading: current,
      type,
      meter,
    });
    if (!result.ok) {
      throw new AppException(
        ErrorCode.READING_BELOW_PREVIOUS,
        WATER_MESSAGES.READING_BELOW_PREVIOUS,
        HttpStatus.UNPROCESSABLE_ENTITY,
        {
          meterId: meter.id,
          previousReading: previous,
          readingValue: current,
          type,
        },
      );
    }
    return result.consumption;
  }

  private assertDate(readingDate: Date, previousDate: Date | null, now: Date): void {
    if (readingDate.getTime() > now.getTime()) {
      throw new AppException(
        ErrorCode.READING_IN_FUTURE,
        WATER_MESSAGES.READING_IN_FUTURE,
        HttpStatus.BAD_REQUEST,
        { readingDate },
      );
    }
    if (
      previousDate !== null &&
      startOfDay(readingDate).getTime() < startOfDay(previousDate).getTime()
    ) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        WATER_MESSAGES.READING_BEFORE_PREVIOUS,
        HttpStatus.BAD_REQUEST,
        { readingDate, previousDate },
      );
    }
  }
}

function previousOf(meter: MeterWithLatest): PreviousReadingState {
  const latest = meter.readings[0];
  return latest === undefined
    ? { value: meter.initialReading, date: null }
    : { value: latest.readingValue, date: latest.readingDate };
}
