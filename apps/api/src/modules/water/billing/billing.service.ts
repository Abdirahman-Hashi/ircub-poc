import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { addDays } from 'date-fns';
import { Decimal } from 'decimal.js';

import {
  BillingCycleStatus,
  type BillingCycleStats,
  BillStatus,
  ErrorCode,
  type Paginated,
  WaterAccountStatus,
  AlertSeverity,
  AlertType,
} from '@ircub/shared';

import { AppException } from '../../../common/errors/app.exception';
import { IdsService } from '../../../common/ids/ids.service';
import { JOB } from '../../../common/jobs/job-names';
import { JobsService } from '../../../common/jobs/jobs.service';
import { roundMoney } from '../../../common/money/money.rules';
import { parseSort, toPageSlice, toPaginated } from '../../../common/pagination/pagination.rules';
import { EventBus } from '../../../common/sse/event-bus';
import { SSE_EVENT } from '../../../common/sse/event-names';
import { PrismaService } from '../../../prisma/prisma.service';
import { AlertsService } from '../../dashboard/alerts.service';
import { ALERT_TEXT } from '../../dashboard/dashboard.constants';
import { SummaryService } from '../../dashboard/summary.service';
import { SystemConfigKey } from '../../system-config/system-config.keys';
import { SystemConfigService } from '../../system-config/system-config.service';
import { computeTieredCharge } from '../tariffs/tariffs.rules';
import { FLAG_REASON, SKIP_REASON } from '../water.constants';
import { WATER_MESSAGES } from '../water.messages';
import { BILL_INCLUDE, toBillView, toCycleView } from '../water.view';

import { BILLING_API } from './billing.constants';
import { arrearsOf, isValidPeriod, periodBounds, totalDueOf } from './billing.rules';

import type { BillComputation } from './billing.types';
import type { CycleRow } from '../water-views.types';
import type { BillingCycleFilterDto } from './dto/billing-cycle-filter.dto';
import type { BillingCycleResponseDto } from './dto/billing-cycle.response.dto';
import type { BillResponseDto } from '../bills/dto/bill.response.dto';
import type { Prisma } from '@prisma/client';

/**
 * Monthly billing cycle (D14): DRAFT → REVIEW (after the run) → RELEASED. Each account is
 * billed in its own transaction so one failure becomes an exception-report line instead of
 * aborting the cycle. Flagged bills (abnormal readings) block release until reviewed.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdsService,
    private readonly systemConfig: SystemConfigService,
    private readonly jobs: JobsService,
    private readonly events: EventBus,
    private readonly alerts: AlertsService,
    private readonly summaries: SummaryService,
  ) {}

  async run(period: string, actorId: string): Promise<BillingCycleResponseDto> {
    if (!isValidPeriod(period)) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        WATER_MESSAGES.CYCLE_INVALID_PERIOD,
        HttpStatus.BAD_REQUEST,
        { period },
      );
    }
    const existing = await this.prisma.billingCycle.findUnique({ where: { period } });
    if (existing?.status === BillingCycleStatus.RELEASED) {
      throw new AppException(
        ErrorCode.BILLING_CYCLE_INVALID_STATE,
        WATER_MESSAGES.CYCLE_RELEASED,
        HttpStatus.CONFLICT,
        { period },
      );
    }
    if (existing !== null) {
      const paid = await this.prisma.payment.count({ where: { bill: { cycleId: existing.id } } });
      if (paid > 0) {
        throw new AppException(
          ErrorCode.BILLING_CYCLE_INVALID_STATE,
          WATER_MESSAGES.CYCLE_HAS_PAYMENTS,
          HttpStatus.CONFLICT,
          { period },
        );
      }
      await this.prisma.bill.deleteMany({ where: { cycleId: existing.id } });
    }
    const cycle =
      existing ??
      (await this.prisma.billingCycle.create({
        data: { period, runById: actorId, stats: emptyStats() as unknown as Prisma.InputJsonValue },
      }));

    const bounds = periodBounds(period);
    const dueDays = await this.systemConfig.get(SystemConfigKey.BILL_DUE_DAYS);
    const localCurrency = await this.systemConfig.get(SystemConfigKey.LOCAL_CURRENCY);
    const accounts = await this.prisma.waterAccount.findMany({
      where: { status: WaterAccountStatus.ACTIVE },
      include: {
        tariffCategory: { include: { tiers: true } },
        meters: { select: { id: true, status: true, initialReading: true } },
      },
    });

    const skipped: { accountNumber: string; reason: string }[] = [];
    let billed = 0;
    let flagged = 0;
    let totalBilled = new Decimal(0);

    for (const account of accounts) {
      try {
        const computed = await this.computeForAccount(account, bounds.start, bounds.end, cycle.id);
        if (computed === null) {
          skipped.push({ accountNumber: account.accountNumber, reason: SKIP_REASON.NO_READING });
          continue;
        }
        if (account.tariffCategory.tiers.length === 0) {
          skipped.push({
            accountNumber: account.accountNumber,
            reason: SKIP_REASON.TARIFF_NOT_CONFIGURED,
          });
          continue;
        }
        await this.prisma.$transaction(async (tx) => {
          const billNumber = await this.ids.nextControlNumber(tx, 'BILL');
          await tx.bill.create({
            data: {
              billNumber,
              cycleId: cycle.id,
              accountId: account.id,
              payerId: account.payerId,
              periodStart: bounds.start,
              periodEnd: bounds.end,
              previousReading: computed.previousReading,
              currentReading: computed.currentReading,
              consumption: computed.consumption,
              tierBreakdown: computed.tierBreakdown as unknown as Prisma.InputJsonValue,
              consumptionCharge: computed.consumptionCharge.toFixed(),
              fixedCharge: computed.fixedCharge.toFixed(),
              arrears: computed.arrears.toFixed(),
              totalDue: computed.totalDue.toFixed(),
              currency: localCurrency,
              status: computed.status,
              flagged: computed.flagged,
              flagReason: computed.flagReason,
              dueDate: addDays(bounds.end, dueDays),
            },
          });
        });
        billed += 1;
        if (computed.flagged) {
          flagged += 1;
        }
        totalBilled = totalBilled.plus(computed.totalDue);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error({
          msg: 'billing: account failed',
          accountId: account.id,
          error: message,
        });
        skipped.push({
          accountNumber: account.accountNumber,
          reason: `${SKIP_REASON.ERROR}: ${message}`,
        });
      }
    }

    const stats: BillingCycleStats = {
      accounts: accounts.length,
      billed,
      flagged,
      skipped,
      totalBilled: roundMoney(totalBilled).toFixed(),
    };
    const updated = await this.prisma.billingCycle.update({
      where: { id: cycle.id },
      data: {
        status: BillingCycleStatus.REVIEW,
        runById: actorId,
        runAt: new Date(),
        stats: stats as unknown as Prisma.InputJsonValue,
      },
    });
    this.logger.log({
      msg: 'billing cycle run',
      cycleId: cycle.id,
      period,
      ...stats,
      skipped: skipped.length,
    });
    this.events.emit(SSE_EVENT.BILLING_CYCLE_UPDATED, {
      cycleId: cycle.id,
      status: updated.status,
    });
    if (flagged > 0) {
      await this.alerts.raise({
        type: AlertType.ABNORMAL_CONSUMPTION,
        severity: AlertSeverity.WARNING,
        title: ALERT_TEXT.ABNORMAL_CONSUMPTION.title,
        message: ALERT_TEXT.ABNORMAL_CONSUMPTION.message(period, flagged),
        data: { cycleId: cycle.id, period, flagged },
        dedupeKey: cycle.id,
      });
    }
    return toCycleView(updated);
  }

  /** Bill inputs for one account, or null when no reading fell in the period. */
  private async computeForAccount(
    account: {
      id: string;
      payerId: string;
      tariffCategory: {
        fixedCharge: Prisma.Decimal;
        tiers: { fromUnit: number; toUnit: number | null; ratePerUnit: Prisma.Decimal }[];
      };
      meters: { id: string; status: string; initialReading: number }[];
    },
    start: Date,
    end: Date,
    cycleId: string,
  ): Promise<BillComputation | null> {
    const meterIds = account.meters.map((meter) => meter.id);
    const readings = await this.prisma.meterReading.findMany({
      where: { meterId: { in: meterIds }, readingDate: { gte: start, lte: end } },
      orderBy: [{ readingDate: 'asc' }, { createdAt: 'asc' }],
    });
    const first = readings[0];
    const last = readings[readings.length - 1];
    if (first === undefined || last === undefined) {
      return null;
    }
    const before = await this.prisma.meterReading.findFirst({
      where: { meterId: first.meterId, readingDate: { lt: start } },
      orderBy: [{ readingDate: 'desc' }, { createdAt: 'desc' }],
    });
    const meter = account.meters.find((candidate) => candidate.id === first.meterId);
    const previousReading = before?.readingValue ?? meter?.initialReading ?? 0;
    const consumption = readings.reduce((sum, reading) => sum + reading.consumption, 0);
    const abnormal = readings.find((reading) => reading.abnormal);

    const charge = computeTieredCharge(consumption, account.tariffCategory.tiers);
    const previousBills = await this.prisma.bill.findMany({
      where: {
        accountId: account.id,
        cycleId: { not: cycleId },
        status: { in: [BillStatus.RELEASED, BillStatus.PART_PAID, BillStatus.PAID] },
      },
      select: { consumptionCharge: true, fixedCharge: true, paidAmount: true },
    });
    const arrears = arrearsOf(previousBills);
    const fixedCharge = roundMoney(account.tariffCategory.fixedCharge);
    const totalDue = totalDueOf(charge.consumptionCharge, fixedCharge, arrears);
    return {
      accountId: account.id,
      payerId: account.payerId,
      previousReading,
      currentReading: last.readingValue,
      consumption,
      tierBreakdown: charge.lines.map((line) => ({
        from: line.from,
        to: line.to,
        units: line.units,
        rate: line.rate.toFixed(),
        amount: line.amount.toFixed(),
      })),
      consumptionCharge: charge.consumptionCharge,
      fixedCharge,
      arrears,
      totalDue,
      flagged: abnormal !== undefined,
      flagReason:
        abnormal === undefined
          ? null
          : `${FLAG_REASON.ABNORMAL_CONSUMPTION}: ${abnormal.abnormalReason ?? ''}`,
      status: abnormal === undefined ? BillStatus.DRAFT : BillStatus.FLAGGED,
    };
  }

  async list(filter: BillingCycleFilterDto): Promise<Paginated<BillingCycleResponseDto>> {
    const where: Prisma.BillingCycleWhereInput =
      filter.status === undefined ? {} : { status: filter.status };
    const sort = parseSort(filter.sort, BILLING_API.SORTABLE, {
      field: 'period',
      direction: 'desc',
    });
    const { skip, take } = toPageSlice(filter.page, filter.pageSize);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.billingCycle.findMany({
        where,
        skip,
        take,
        orderBy: { [sort.field]: sort.direction },
      }),
      this.prisma.billingCycle.count({ where }),
    ]);
    return toPaginated(rows.map(toCycleView), total, filter.page, filter.pageSize);
  }

  async get(id: string): Promise<BillingCycleResponseDto> {
    return toCycleView(await this.findOrThrow(id));
  }

  /** Flag review (billing.release): clear → bill becomes DRAFT; confirm → stays FLAGGED (held). */
  async clearFlag(billId: string, note: string): Promise<BillResponseDto> {
    const bill = await this.flaggedBillOrThrow(billId);
    const updated = await this.prisma.bill.update({
      where: { id: bill.id },
      data: { flagged: false, status: BillStatus.DRAFT, flagNote: note },
      include: BILL_INCLUDE,
    });
    await this.refreshFlagCount(bill.cycleId);
    return toBillView(updated);
  }

  async confirmFlag(billId: string, note: string): Promise<BillResponseDto> {
    const bill = await this.flaggedBillOrThrow(billId);
    const updated = await this.prisma.bill.update({
      where: { id: bill.id },
      data: { flagNote: note },
      include: BILL_INCLUDE,
    });
    return toBillView(updated);
  }

  /** REVIEW → RELEASED: refuses while any bill is still flagged; enqueues PDF + notifications per bill. */
  async release(id: string, actorId: string): Promise<BillingCycleResponseDto> {
    const cycle = await this.findOrThrow(id);
    if (cycle.status !== BillingCycleStatus.REVIEW) {
      throw new AppException(
        ErrorCode.BILLING_CYCLE_INVALID_STATE,
        WATER_MESSAGES.CYCLE_NOT_IN_REVIEW,
        HttpStatus.CONFLICT,
        { status: cycle.status },
      );
    }
    const flagged = await this.prisma.bill.count({ where: { cycleId: id, flagged: true } });
    if (flagged > 0) {
      throw new AppException(
        ErrorCode.BILLING_CYCLE_HAS_FLAGGED_BILLS,
        WATER_MESSAGES.CYCLE_HAS_FLAGGED,
        HttpStatus.CONFLICT,
        { flagged },
      );
    }
    const releasedAt = new Date();
    const bills = await this.prisma.bill.findMany({
      where: { cycleId: id, status: BillStatus.DRAFT },
      select: { id: true },
    });
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.bill.updateMany({
        where: { cycleId: id, status: BillStatus.DRAFT },
        data: { status: BillStatus.RELEASED, releasedAt },
      });
      return tx.billingCycle.update({
        where: { id },
        data: { status: BillingCycleStatus.RELEASED, releasedById: actorId, releasedAt },
      });
    });
    const periodEnds = await this.prisma.bill.findMany({
      where: { cycleId: id },
      select: { periodEnd: true },
      distinct: ['periodEnd'],
    });
    for (const bill of periodEnds) {
      this.summaries.markDirty(bill.periodEnd);
    }
    for (const bill of bills) {
      await this.jobs.enqueue(JOB.BILL_RENDER_PDF, { billId: bill.id });
    }
    this.logger.log({ msg: 'billing cycle released', cycleId: id, bills: bills.length });
    this.events.emit(SSE_EVENT.BILLING_CYCLE_UPDATED, { cycleId: id, status: updated.status });
    return toCycleView(updated);
  }

  async incrementNotificationsSent(cycleId: string, count: number): Promise<void> {
    const cycle = await this.findOrThrow(cycleId);
    const stats = cycle.stats as unknown as BillingCycleStats;
    await this.prisma.billingCycle.update({
      where: { id: cycleId },
      data: {
        stats: {
          ...stats,
          notificationsSent: (stats.notificationsSent ?? 0) + count,
        } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  private async refreshFlagCount(cycleId: string): Promise<void> {
    const cycle = await this.findOrThrow(cycleId);
    const stats = cycle.stats as unknown as BillingCycleStats;
    const flagged = await this.prisma.bill.count({ where: { cycleId, flagged: true } });
    await this.prisma.billingCycle.update({
      where: { id: cycleId },
      data: { stats: { ...stats, flagged } as unknown as Prisma.InputJsonValue },
    });
  }

  private async flaggedBillOrThrow(billId: string): Promise<{ id: string; cycleId: string }> {
    const bill = await this.prisma.bill.findUnique({
      where: { id: billId },
      select: { id: true, cycleId: true, flagged: true },
    });
    if (bill === null) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        WATER_MESSAGES.BILL_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        { billId },
      );
    }
    if (!bill.flagged) {
      throw new AppException(
        ErrorCode.BILL_NOT_FLAGGED,
        WATER_MESSAGES.BILL_NOT_FLAGGED,
        HttpStatus.CONFLICT,
        { billId },
      );
    }
    return bill;
  }

  private async findOrThrow(id: string): Promise<CycleRow> {
    const row = await this.prisma.billingCycle.findUnique({ where: { id } });
    if (row === null) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        WATER_MESSAGES.CYCLE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        { id },
      );
    }
    return row;
  }
}

function emptyStats(): BillingCycleStats {
  return { accounts: 0, billed: 0, flagged: 0, skipped: [], totalBilled: '0' };
}
