import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { subDays } from 'date-fns';

import { AlertType, ErrorCode, type Paginated, PaymentStatus, ReversalStatus } from '@ircub/shared';

import { AppException } from '../../common/errors/app.exception';
import { AMOUNT_SCALE } from '../../common/money/money.constants';
import { toDecimal } from '../../common/money/money.rules';
import { parseSort, toPageSlice, toPaginated } from '../../common/pagination/pagination.rules';
import { EventBus } from '../../common/sse/event-bus';
import { SSE_EVENT } from '../../common/sse/event-names';
import { PRISMA_ERROR } from '../../prisma/prisma.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { toDateKey } from '../fmis/fmis.rules';
import { utcDayBounds } from '../reconciliation/reconciliation.rules';
import { SystemConfigKey } from '../system-config/system-config.keys';
import { SystemConfigService } from '../system-config/system-config.service';

import { ALERT_TEXT, DASHBOARD_API } from './dashboard.constants';
import { DASHBOARD_MESSAGES } from './dashboard.messages';
import { anomalyVerdict, dayFraction } from './dashboard.rules';

import type { AlertRow, RaiseAlertInput } from './dashboard.types';
import type { AlertFilterDto } from './dto/alert-filter.dto';
import type { AlertResponseDto } from './dto/alert.response.dto';
import type { Prisma } from '@prisma/client';

const ALERT_SORTABLE = ['createdAt', 'severity', 'type'] as const;

/**
 * Real-time anomaly alerts (D18). Every five minutes today's collections so far are compared
 * with the trailing days scaled to the same fraction of the day, and today's approved
 * reversals with the trailing daily counts; z-scores beyond the configured thresholds raise
 * alerts. Other modules raise event alerts through `raise`. One open alert per type and
 * de-duplication key.
 */
@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly systemConfig: SystemConfigService,
    private readonly events: EventBus,
  ) {}

  @Cron(DASHBOARD_API.ALERT_CRON)
  async evaluateScheduled(): Promise<void> {
    await this.evaluate(new Date());
  }

  /** Runs both anomaly checks; returns the alerts raised. */
  async evaluate(now: Date): Promise<AlertResponseDto[]> {
    const [warning, critical, trailingDays] = await Promise.all([
      this.systemConfig.get(SystemConfigKey.ANOMALY_Z_WARNING),
      this.systemConfig.get(SystemConfigKey.ANOMALY_Z_CRITICAL),
      this.systemConfig.get(SystemConfigKey.ANOMALY_TRAILING_DAYS),
    ]);
    const today = toDateKey(now);
    const { start: todayStart } = utcDayBounds(today);
    const baselineStart = utcDayBounds(toDateKey(subDays(now, trailingDays))).start;
    const [baseline, todayPayments, todayReversals] = await Promise.all([
      this.prisma.dailyCollectionSummary.groupBy({
        by: ['date'],
        where: { date: { gte: baselineStart, lt: todayStart } },
        _sum: { total: true, reversedCount: true },
      }),
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.CONFIRMED, paidAt: { gte: todayStart } },
        _sum: { localAmount: true },
      }),
      this.prisma.reversal.count({
        where: { status: ReversalStatus.APPROVED, decidedAt: { gte: todayStart } },
      }),
    ]);
    const fraction = dayFraction(now);
    const dailyTotals = baseline.map(
      (row) => Number(toDecimal(row._sum.total ?? 0).toFixed(AMOUNT_SCALE)) * fraction,
    );
    const dailyReversals = baseline.map((row) => row._sum.reversedCount ?? 0);
    const todaySoFar = Number(toDecimal(todayPayments._sum.localAmount ?? 0).toFixed(AMOUNT_SCALE));
    const raised: AlertResponseDto[] = [];

    const drop = anomalyVerdict(
      todaySoFar,
      dailyTotals,
      -1,
      warning,
      critical,
      DASHBOARD_API.MIN_BASELINE_DAYS,
    );
    if (drop.severity !== null && drop.z !== null) {
      const alert = await this.raise({
        type: AlertType.COLLECTION_DROP,
        severity: drop.severity,
        title: ALERT_TEXT.COLLECTION_DROP.title,
        message: ALERT_TEXT.COLLECTION_DROP.message(
          toDecimal(todaySoFar).toFixed(AMOUNT_SCALE),
          toDecimal(drop.mean).toFixed(AMOUNT_SCALE),
          drop.z.toFixed(ALERT_TEXT.Z_DECIMALS),
        ),
        data: {
          day: today,
          todaySoFar,
          expected: drop.mean,
          z: drop.z,
          samples: dailyTotals.length,
        },
        dedupeKey: today,
      });
      if (alert !== null) {
        raised.push(alert);
      }
    }
    const spike = anomalyVerdict(
      todayReversals,
      dailyReversals,
      1,
      warning,
      critical,
      DASHBOARD_API.MIN_BASELINE_DAYS,
    );
    if (spike.severity !== null && spike.z !== null) {
      const alert = await this.raise({
        type: AlertType.REVERSAL_SPIKE,
        severity: spike.severity,
        title: ALERT_TEXT.REVERSAL_SPIKE.title,
        message: ALERT_TEXT.REVERSAL_SPIKE.message(
          todayReversals,
          spike.mean.toFixed(1),
          spike.z.toFixed(ALERT_TEXT.Z_DECIMALS),
        ),
        data: {
          day: today,
          reversals: todayReversals,
          mean: spike.mean,
          z: spike.z,
          samples: dailyReversals.length,
        },
        dedupeKey: today,
      });
      if (alert !== null) {
        raised.push(alert);
      }
    }
    this.logger.log({
      msg: 'anomalies evaluated',
      day: today,
      todaySoFar,
      samples: dailyTotals.length,
      dropZ: drop.z,
      spikeZ: spike.z,
      raised: raised.length,
    });
    return raised;
  }

  /**
   * Creates the alert unless an open one with the same type and key exists; emits SSE. The
   * partial unique index `alert_open_dedupe_key` is the guarantee: two evaluators racing on
   * the same key get one alert, the loser's unique violation is treated as "already open".
   */
  async raise(input: RaiseAlertInput): Promise<AlertResponseDto | null> {
    const open = await this.prisma.alert.findFirst({
      where: { type: input.type, dedupeKey: input.dedupeKey, acknowledgedAt: null },
      select: { id: true },
    });
    if (open !== null) {
      return null;
    }
    let alert: AlertRow;
    try {
      alert = await this.prisma.alert.create({
        data: {
          type: input.type,
          severity: input.severity,
          title: input.title,
          message: input.message,
          data: input.data,
          dedupeKey: input.dedupeKey,
        },
      });
    } catch (error: unknown) {
      if (
        (error as Prisma.PrismaClientKnownRequestError | null)?.code ===
        PRISMA_ERROR.UNIQUE_VIOLATION
      ) {
        return null;
      }
      throw error;
    }
    this.events.emit(SSE_EVENT.ALERT_CREATED, {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
    });
    this.logger.warn({
      msg: 'alert raised',
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
    });
    return toAlertView(alert);
  }

  async list(filter: AlertFilterDto): Promise<Paginated<AlertResponseDto>> {
    const where: Prisma.AlertWhereInput = {
      ...(filter.acknowledged === undefined
        ? {}
        : { acknowledgedAt: filter.acknowledged ? { not: null } : null }),
      ...(filter.type === undefined ? {} : { type: filter.type }),
      ...(filter.severity === undefined ? {} : { severity: filter.severity }),
    };
    const sort = parseSort(filter.sort, ALERT_SORTABLE, { field: 'createdAt', direction: 'desc' });
    const { skip, take } = toPageSlice(filter.page, filter.pageSize);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.alert.findMany({ where, skip, take, orderBy: { [sort.field]: sort.direction } }),
      this.prisma.alert.count({ where }),
    ]);
    return toPaginated(rows.map(toAlertView), total, filter.page, filter.pageSize);
  }

  async unacknowledgedCount(): Promise<number> {
    return this.prisma.alert.count({ where: { acknowledgedAt: null } });
  }

  async acknowledge(id: string, actorId: string): Promise<AlertResponseDto> {
    const alert = await this.prisma.alert.findUnique({ where: { id } });
    if (alert === null) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        DASHBOARD_MESSAGES.ALERT_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        { id },
      );
    }
    if (alert.acknowledgedAt !== null) {
      throw new AppException(
        ErrorCode.CONFLICT,
        DASHBOARD_MESSAGES.ALREADY_ACKNOWLEDGED,
        HttpStatus.CONFLICT,
        { id },
      );
    }
    const updated = await this.prisma.alert.update({
      where: { id },
      data: { acknowledgedById: actorId, acknowledgedAt: new Date() },
    });
    this.logger.log({ msg: 'alert acknowledged', alertId: id, actorId });
    return toAlertView(updated);
  }
}

export function toAlertView(row: AlertRow): AlertResponseDto {
  return {
    id: row.id,
    type: row.type,
    severity: row.severity,
    title: row.title,
    message: row.message,
    data: row.data,
    createdAt: row.createdAt,
    acknowledgedById: row.acknowledgedById,
    acknowledgedAt: row.acknowledgedAt,
  };
}
