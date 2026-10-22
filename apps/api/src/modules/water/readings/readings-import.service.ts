import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { Injectable, Logger } from '@nestjs/common';
import { startOfDay } from 'date-fns';

import { BulkUploadKind, MeterStatus, ReadingSource } from '@ircub/shared';

import { CsvImportService } from '../../../common/csv/csv-import.service';
import { CSV_IMPORT } from '../../../common/csv/csv.constants';
import { templateCsv } from '../../../common/csv/csv.rules';
import { AppConfigService } from '../../../config/app-config.service';
import { storedFileName } from '../../bulk-uploads/bulk-uploads.rules';
import { SystemConfigKey } from '../../system-config/system-config.keys';
import { SystemConfigService } from '../../system-config/system-config.service';
import { MetersService } from '../meters/meters.service';
import { WATER_MESSAGES } from '../water.messages';

import { METER_READINGS_TEMPLATE, READING_COLUMN, READING_REASON } from './readings.constants';
import { computeConsumption } from './readings.rules';
import { type MeterReadingRow, meterReadingRowSchema } from './readings.schema';
import { ReadingsService } from './readings.service';

import type { ReadingsImportContext } from './readings.types';
import type { AcceptedRow, CsvImportSummary, RowOutcome } from '../../../common/csv/csv.types';
import type { TransactionClient } from '../../../prisma/prisma.types';
import type { CsvSummaryResponseDto } from '../../bulk-uploads/dto/csv-summary.response.dto';
import type { Prisma } from '@prisma/client';

/** Meter readings via the shared CSV pipeline (D12, D13): same rules as single capture, per row. */
@Injectable()
export class ReadingsImportService {
  private readonly logger = new Logger(ReadingsImportService.name);

  constructor(
    private readonly csv: CsvImportService,
    private readonly meters: MetersService,
    private readonly readings: ReadingsService,
    private readonly systemConfig: SystemConfigService,
    private readonly config: AppConfigService,
  ) {}

  template(): string {
    return templateCsv(METER_READINGS_TEMPLATE.columns);
  }

  async import(
    content: Buffer,
    fileName: string,
    dryRun: boolean,
    uploaderId: string,
  ): Promise<CsvSummaryResponseDto> {
    const maxRows = await this.systemConfig.get(SystemConfigKey.CSV_MAX_ROWS);
    const uploadId = randomUUID();
    const storedPath = join(CSV_IMPORT.UPLOAD_DIR, storedFileName(uploadId));

    const result = await this.csv.run<MeterReadingRow, ReadingsImportContext>({
      content,
      expectedColumns: METER_READINGS_TEMPLATE.columns,
      schema: meterReadingRowSchema,
      maxRows,
      dryRun,
      createContext: () => this.buildContext(content),
      validateRow: (row, _rowNumber, context) => Promise.resolve(this.validateRow(row, context)),
      persist: (accepted, summary, _context, tx) =>
        this.persist(uploadId, fileName, storedPath, uploaderId, accepted, summary, tx),
    });
    if (!dryRun) {
      await mkdir(join(this.config.storageDir, CSV_IMPORT.UPLOAD_DIR), { recursive: true });
      await writeFile(join(this.config.storageDir, storedPath), content);
    }
    return { ...result.summary, rejected: [...result.summary.rejected] };
  }

  private async buildContext(content: Buffer): Promise<ReadingsImportContext> {
    const serials = new Set<string>();
    for (const line of content.toString(CSV_IMPORT.ENCODING).split(/\r?\n/).slice(1)) {
      const serial = line.split(CSV_IMPORT.DELIMITER)[0]?.trim();
      if (serial !== undefined && serial.length > 0) {
        serials.add(serial);
      }
    }
    const meters = await this.meters.findManyBySerial([...serials]);
    const latestByMeter = new Map<string, { value: number; date: Date }>();
    for (const meter of meters) {
      const latest = meter.readings[0];
      latestByMeter.set(
        meter.id,
        latest === undefined
          ? { value: meter.initialReading, date: new Date(0) }
          : { value: latest.readingValue, date: latest.readingDate },
      );
    }
    return {
      metersBySerial: new Map(meters.map((meter) => [meter.serial, meter])),
      latestByMeter,
      now: new Date(),
    };
  }

  private validateRow(row: MeterReadingRow, context: ReadingsImportContext): RowOutcome {
    const meter = context.metersBySerial.get(row.meter_serial);
    if (meter === undefined) {
      return reject(
        READING_COLUMN.METER_SERIAL,
        READING_REASON.UNKNOWN_METER,
        WATER_MESSAGES.METER_NOT_FOUND,
      );
    }
    if (meter.status !== MeterStatus.ACTIVE) {
      return reject(
        READING_COLUMN.METER_SERIAL,
        READING_REASON.METER_NOT_ACTIVE,
        WATER_MESSAGES.METER_NOT_ACTIVE,
      );
    }
    const latest = context.latestByMeter.get(meter.id) ?? {
      value: meter.initialReading,
      date: new Date(0),
    };
    const readingDate = startOfDay(row.reading_date);
    if (readingDate.getTime() > context.now.getTime()) {
      return reject(
        READING_COLUMN.READING_DATE,
        READING_REASON.DATE_IN_FUTURE,
        WATER_MESSAGES.READING_IN_FUTURE,
      );
    }
    if (readingDate.getTime() === startOfDay(latest.date).getTime()) {
      return reject(
        READING_COLUMN.READING_DATE,
        READING_REASON.DUPLICATE_DATE,
        WATER_MESSAGES.READING_DUPLICATE_DATE,
      );
    }
    if (readingDate.getTime() < startOfDay(latest.date).getTime()) {
      return reject(
        READING_COLUMN.READING_DATE,
        READING_REASON.DATE_BEFORE_PREVIOUS,
        WATER_MESSAGES.READING_BEFORE_PREVIOUS,
      );
    }
    const result = computeConsumption({
      previousReading: latest.value,
      currentReading: row.reading_value,
      type: row.type,
      meter,
    });
    if (!result.ok) {
      return reject(
        READING_COLUMN.READING_VALUE,
        READING_REASON[result.reason],
        WATER_MESSAGES[result.reason],
      );
    }
    context.latestByMeter.set(meter.id, { value: row.reading_value, date: readingDate });
    return { ok: true };
  }

  private async persist(
    uploadId: string,
    fileName: string,
    storedPath: string,
    uploaderId: string,
    accepted: readonly AcceptedRow<MeterReadingRow>[],
    summary: CsvImportSummary,
    tx: TransactionClient,
  ): Promise<string> {
    const upload = await tx.bulkUpload.create({
      data: {
        id: uploadId,
        kind: BulkUploadKind.METER_READINGS,
        fileName,
        storedPath,
        totalRows: summary.totalRows,
        accepted: summary.accepted,
        rejected: summary.rejected.length,
        summary: { ...summary, uploadId } as unknown as Prisma.InputJsonValue,
        uploadedById: uploaderId,
      },
    });
    // Rows for the same meter are applied in file order so each chains on the one before.
    for (const { data } of accepted) {
      const meter = await this.meters.findBySerial(data.meter_serial);
      if (meter === null) {
        continue;
      }
      await this.readings.recordReading(tx, {
        meter,
        readingDate: data.reading_date,
        readingValue: data.reading_value,
        type: data.type,
        source: ReadingSource.CSV,
        capturedById: uploaderId,
        bulkUploadId: upload.id,
      });
    }
    this.logger.log({
      msg: 'meter readings imported',
      uploadId: upload.id,
      accepted: accepted.length,
      rejected: summary.rejected.length,
    });
    return upload.id;
  }
}

function reject(field: string, reason: string, message: string): RowOutcome {
  return { ok: false, field, reason, message };
}
