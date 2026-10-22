import { HttpStatus, Injectable } from '@nestjs/common';

import {
  AssessmentStatus,
  BillStatus,
  DASHBOARD,
  ErrorCode,
  PaymentChannel,
  REVENUE_TYPE_CODES,
} from '@ircub/shared';

import { AppException } from '../../common/errors/app.exception';
import { AMOUNT_SCALE } from '../../common/money/money.constants';
import { toDecimal } from '../../common/money/money.rules';
import { PrismaService } from '../../prisma/prisma.service';
import { daysBetween } from '../fmis/fmis.rules';
import { utcDayBounds } from '../reconciliation/reconciliation.rules';

import { DASHBOARD_API } from './dashboard.constants';
import { DASHBOARD_MESSAGES } from './dashboard.messages';
import {
  buildTrends,
  percent,
  periodsBetween,
  sameRangeLastYear,
  toPeriodKey,
} from './dashboard.rules';

import type { EfficiencyRowResponseDto } from './dto/efficiency-row.response.dto';
import type { OverviewResponseDto } from './dto/overview.response.dto';
import type { TargetAttainmentRowResponseDto } from './dto/target-attainment-row.response.dto';
import type { TrendsQueryDto } from './dto/trends-query.dto';
import type { TrendsResponseDto } from './dto/trends.response.dto';

/** Reads summaries only (D18): no endpoint here touches raw payment rows. */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(from: string, to: string): Promise<OverviewResponseDto> {
    this.assertRange(from, to);
    const water = await this.waterTypeId();
    const [current, lastYear, billing, outstandingAssessments, outstandingWater, target] =
      await Promise.all([
        this.collectionTotals(from, to),
        this.collectionTotals(sameRangeLastYear(from, to).from, sameRangeLastYear(from, to).to),
        this.billingTotals(from, to),
        this.outstandingAssessments(),
        this.outstandingWater(),
        this.targetTotal(
          periodsBetween(toPeriodKey(new Date(from)), toPeriodKey(new Date(to))),
          water,
        ),
      ]);
    const taxCollected = current.total.minus(current.byType.get(water ?? '') ?? toDecimal(0));
    return {
      from,
      to,
      collected: current.total.toFixed(AMOUNT_SCALE),
      collectedCount: current.count,
      collectedLastYear: lastYear.total.toFixed(AMOUNT_SCALE),
      changeVsLastYearPct: lastYear.total.isZero()
        ? null
        : percent(
            current.total.minus(lastYear.total).toFixed(AMOUNT_SCALE),
            lastYear.total.toFixed(AMOUNT_SCALE),
          ),
      reversed: current.reversedTotal.toFixed(AMOUNT_SCALE),
      reversedCount: current.reversedCount,
      outstandingAssessments,
      outstandingWater,
      waterBilled: billing.billed,
      waterCollected: billing.collected,
      collectionEfficiencyPct: percent(billing.collected, billing.billed),
      target: target.toFixed(AMOUNT_SCALE),
      targetAttainmentPct: percent(
        taxCollected.toFixed(AMOUNT_SCALE),
        target.toFixed(AMOUNT_SCALE),
      ),
    };
  }

  async trends(query: TrendsQueryDto): Promise<TrendsResponseDto> {
    this.assertRange(query.from, query.to);
    const { start } = utcDayBounds(query.from);
    const { end } = utcDayBounds(query.to);
    const rows = await this.prisma.dailyCollectionSummary.findMany({
      where: { date: { gte: start, lt: end } },
      select: { date: true, revenueTypeId: true, channel: true, total: true, count: true },
      orderBy: { date: 'asc' },
    });
    const labels =
      query.by === DASHBOARD.BY.CHANNEL
        ? new Map(Object.values(PaymentChannel).map((c) => [c, c]))
        : await this.typeLabels();
    const { buckets, series } = buildTrends(rows, { groupBy: query.groupBy, by: query.by, labels });
    return {
      groupBy: query.groupBy,
      by: query.by,
      buckets,
      series: series.map((s) => ({ key: s.key, label: s.label, points: [...s.points] })),
    };
  }

  /** Collected vs target per revenue type and month (WATER excluded: it has bills, not targets). */
  async targetAttainment(from: string, to: string): Promise<TargetAttainmentRowResponseDto[]> {
    const periods = periodsBetween(from, to);
    if (periods.length === 0 || periods.length > DASHBOARD_API.MAX_TARGET_MONTHS) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        DASHBOARD_MESSAGES.RANGE_TOO_LONG,
        HttpStatus.BAD_REQUEST,
        { from, to },
      );
    }
    const first = periods[0] ?? from;
    const last = periods[periods.length - 1] ?? to;
    const { start } = utcDayBounds(`${first}-01`);
    const endPeriod = periodsBetween(last, last).length > 0 ? last : to;
    const [endYear, endMonth] = endPeriod.split('-').map(Number) as [number, number];
    const end = new Date(Date.UTC(endYear, endMonth, 1));
    const [types, targets, rows] = await Promise.all([
      this.prisma.revenueType.findMany({
        where: { code: { not: REVENUE_TYPE_CODES.WATER } },
        select: { id: true, code: true, name: true },
        orderBy: { code: 'asc' },
      }),
      this.prisma.revenueTarget.findMany({ where: { period: { in: periods } } }),
      this.prisma.dailyCollectionSummary.findMany({
        where: { date: { gte: start, lt: end } },
        select: { date: true, revenueTypeId: true, total: true },
      }),
    ]);
    const collected = new Map<string, ReturnType<typeof toDecimal>>();
    for (const row of rows) {
      const key = `${toPeriodKey(row.date)}|${row.revenueTypeId}`;
      collected.set(key, (collected.get(key) ?? toDecimal(0)).plus(toDecimal(row.total)));
    }
    const targetByKey = new Map(
      targets.map((t) => [`${t.period}|${t.revenueTypeId}`, toDecimal(t.amount)]),
    );
    const result: TargetAttainmentRowResponseDto[] = [];
    for (const period of periods) {
      for (const type of types) {
        const key = `${period}|${type.id}`;
        const total = collected.get(key) ?? toDecimal(0);
        const target = targetByKey.get(key) ?? toDecimal(0);
        result.push({
          period,
          revenueTypeId: type.id,
          revenueType: { code: type.code, name: type.name },
          collected: total.toFixed(AMOUNT_SCALE),
          target: target.toFixed(AMOUNT_SCALE),
          attainmentPct: percent(total.toFixed(AMOUNT_SCALE), target.toFixed(AMOUNT_SCALE)),
        });
      }
    }
    return result;
  }

  /** Water billed vs collected per month. */
  async efficiency(from: string, to: string): Promise<EfficiencyRowResponseDto[]> {
    this.assertRange(from, to);
    const { start } = utcDayBounds(from);
    const { end } = utcDayBounds(to);
    const rows = await this.prisma.dailyBillingSummary.findMany({
      where: { date: { gte: start, lt: end } },
      orderBy: { date: 'asc' },
    });
    const byPeriod = new Map<
      string,
      { billed: ReturnType<typeof toDecimal>; collected: ReturnType<typeof toDecimal> }
    >();
    for (const row of rows) {
      const period = toPeriodKey(row.date);
      const current = byPeriod.get(period) ?? { billed: toDecimal(0), collected: toDecimal(0) };
      byPeriod.set(period, {
        billed: current.billed.plus(toDecimal(row.billedTotal)),
        collected: current.collected.plus(toDecimal(row.collectedTotal)),
      });
    }
    return [...byPeriod.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, totals]) => ({
        period,
        billed: totals.billed.toFixed(AMOUNT_SCALE),
        collected: totals.collected.toFixed(AMOUNT_SCALE),
        efficiencyPct: percent(
          totals.collected.toFixed(AMOUNT_SCALE),
          totals.billed.toFixed(AMOUNT_SCALE),
        ),
      }));
  }

  private assertRange(from: string, to: string): void {
    if (from > to) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        DASHBOARD_MESSAGES.RANGE_INVERTED,
        HttpStatus.BAD_REQUEST,
        { from, to },
      );
    }
    if (daysBetween(from, to).length > DASHBOARD_API.MAX_RANGE_DAYS) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        DASHBOARD_MESSAGES.RANGE_TOO_LONG,
        HttpStatus.BAD_REQUEST,
        { from, to },
      );
    }
  }

  private async collectionTotals(from: string, to: string) {
    const { start } = utcDayBounds(from);
    const { end } = utcDayBounds(to);
    const rows = await this.prisma.dailyCollectionSummary.findMany({
      where: { date: { gte: start, lt: end } },
      select: {
        revenueTypeId: true,
        total: true,
        count: true,
        reversedTotal: true,
        reversedCount: true,
      },
    });
    const byType = new Map<string, ReturnType<typeof toDecimal>>();
    let total = toDecimal(0);
    let reversedTotal = toDecimal(0);
    let count = 0;
    let reversedCount = 0;
    for (const row of rows) {
      total = total.plus(toDecimal(row.total));
      reversedTotal = reversedTotal.plus(toDecimal(row.reversedTotal));
      count += row.count;
      reversedCount += row.reversedCount;
      byType.set(
        row.revenueTypeId,
        (byType.get(row.revenueTypeId) ?? toDecimal(0)).plus(toDecimal(row.total)),
      );
    }
    return { total, count, reversedTotal, reversedCount, byType };
  }

  private async billingTotals(
    from: string,
    to: string,
  ): Promise<{ billed: string; collected: string }> {
    const { start } = utcDayBounds(from);
    const { end } = utcDayBounds(to);
    const totals = await this.prisma.dailyBillingSummary.aggregate({
      where: { date: { gte: start, lt: end } },
      _sum: { billedTotal: true, collectedTotal: true },
    });
    return {
      billed: toDecimal(totals._sum.billedTotal ?? 0).toFixed(AMOUNT_SCALE),
      collected: toDecimal(totals._sum.collectedTotal ?? 0).toFixed(AMOUNT_SCALE),
    };
  }

  private async outstandingAssessments(): Promise<string> {
    const totals = await this.prisma.assessment.aggregate({
      where: { status: { in: [AssessmentStatus.PENDING, AssessmentStatus.PART_PAID] } },
      _sum: { amount: true, paidAmount: true },
    });
    return toDecimal(totals._sum.amount ?? 0)
      .minus(toDecimal(totals._sum.paidAmount ?? 0))
      .toFixed(AMOUNT_SCALE);
  }

  private async outstandingWater(): Promise<string> {
    const totals = await this.prisma.bill.aggregate({
      where: { status: { in: [BillStatus.RELEASED, BillStatus.PART_PAID] } },
      _sum: { totalDue: true, paidAmount: true },
    });
    return toDecimal(totals._sum.totalDue ?? 0)
      .minus(toDecimal(totals._sum.paidAmount ?? 0))
      .toFixed(AMOUNT_SCALE);
  }

  private async targetTotal(
    periods: readonly string[],
    waterTypeId: string | null,
  ): Promise<ReturnType<typeof toDecimal>> {
    const totals = await this.prisma.revenueTarget.aggregate({
      where: {
        period: { in: [...periods] },
        ...(waterTypeId === null ? {} : { revenueTypeId: { not: waterTypeId } }),
      },
      _sum: { amount: true },
    });
    return toDecimal(totals._sum.amount ?? 0);
  }

  private async waterTypeId(): Promise<string | null> {
    const water = await this.prisma.revenueType.findUnique({
      where: { code: REVENUE_TYPE_CODES.WATER },
      select: { id: true },
    });
    return water?.id ?? null;
  }

  private async typeLabels(): Promise<Map<string, string>> {
    const types = await this.prisma.revenueType.findMany({ select: { id: true, name: true } });
    return new Map(types.map((t) => [t.id, t.name]));
  }
}
