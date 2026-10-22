import { getISOWeek, getISOWeekYear, subYears } from 'date-fns';
import {
  linearRegression,
  linearRegressionLine,
  rSquared,
  sampleStandardDeviation,
  mean,
} from 'simple-statistics';

import {
  AlertSeverity,
  DASHBOARD,
  type DashboardGroupBy,
  TrendPoint,
  TrendSeries,
} from '@ircub/shared';

import { AMOUNT_SCALE } from '../../common/money/money.constants';
import { toDecimal } from '../../common/money/money.rules';
import { toDateKey } from '../fmis/fmis.rules';

import { DASHBOARD_API } from './dashboard.constants';

import type {
  AnomalyVerdict,
  BillForSummary,
  BillPaymentForSummary,
  BillingSummaryRow,
  CollectionSummaryRow,
  FittedForecast,
  MonthlyTotal,
  PaymentForSummary,
  ReversalForSummary,
  SummaryForTrends,
  TrendOptions,
} from './dashboard.types';

const ISO_WEEK_PAD = 2;
const MS_PER_HOUR = 3_600_000;
const MONTH_KEY_LENGTH = 'YYYY-MM'.length;
const MONTHS_PER_YEAR = 12;

/** `YYYY-MM` of a date (UTC). */
export function toPeriodKey(date: Date): string {
  return toDateKey(date).slice(0, MONTH_KEY_LENGTH);
}

/** Collections per (day, revenue type, channel); reversals land on the day they were decided. */
export function aggregateCollections(
  payments: readonly PaymentForSummary[],
  reversals: readonly ReversalForSummary[],
): CollectionSummaryRow[] {
  const rows = new Map<
    string,
    {
      total: ReturnType<typeof toDecimal>;
      count: number;
      reversedTotal: ReturnType<typeof toDecimal>;
      reversedCount: number;
      date: string;
      revenueTypeId: string;
      channel: PaymentForSummary['channel'];
    }
  >();
  const keyOf = (date: string, revenueTypeId: string, channel: string): string =>
    `${date}|${revenueTypeId}|${channel}`;
  const rowFor = (date: string, revenueTypeId: string, channel: PaymentForSummary['channel']) => {
    const key = keyOf(date, revenueTypeId, channel);
    const existing = rows.get(key);
    if (existing !== undefined) {
      return existing;
    }
    const created = {
      total: toDecimal(0),
      count: 0,
      reversedTotal: toDecimal(0),
      reversedCount: 0,
      date,
      revenueTypeId,
      channel,
    };
    rows.set(key, created);
    return created;
  };
  for (const payment of payments) {
    const row = rowFor(toDateKey(payment.paidAt), payment.revenueTypeId, payment.channel);
    row.total = row.total.plus(toDecimal(payment.localAmount));
    row.count += 1;
  }
  for (const reversal of reversals) {
    const row = rowFor(toDateKey(reversal.decidedAt), reversal.revenueTypeId, reversal.channel);
    row.reversedTotal = row.reversedTotal.plus(toDecimal(reversal.localAmount));
    row.reversedCount += 1;
  }
  return [...rows.values()].map((row) => ({
    date: row.date,
    revenueTypeId: row.revenueTypeId,
    channel: row.channel,
    total: row.total.toFixed(AMOUNT_SCALE),
    count: row.count,
    reversedTotal: row.reversedTotal.toFixed(AMOUNT_SCALE),
    reversedCount: row.reversedCount,
  }));
}

/** Water billed per period-end day and collected per paid day. */
export function aggregateBilling(
  bills: readonly BillForSummary[],
  payments: readonly BillPaymentForSummary[],
): BillingSummaryRow[] {
  const rows = new Map<
    string,
    { billed: ReturnType<typeof toDecimal>; collected: ReturnType<typeof toDecimal> }
  >();
  const rowFor = (date: string) => {
    const existing = rows.get(date);
    if (existing !== undefined) {
      return existing;
    }
    const created = { billed: toDecimal(0), collected: toDecimal(0) };
    rows.set(date, created);
    return created;
  };
  for (const bill of bills) {
    const row = rowFor(toDateKey(bill.periodEnd));
    row.billed = row.billed.plus(toDecimal(bill.totalDue));
  }
  for (const payment of payments) {
    const row = rowFor(toDateKey(payment.paidAt));
    row.collected = row.collected.plus(toDecimal(payment.localAmount));
  }
  return [...rows.entries()].map(([date, row]) => ({
    date,
    billedTotal: row.billed.toFixed(AMOUNT_SCALE),
    collectedTotal: row.collected.toFixed(AMOUNT_SCALE),
  }));
}

/** Bucket key for a day: the day itself, its ISO week (`YYYY-Www`) or its month. */
export function bucketKey(date: Date, groupBy: DashboardGroupBy): string {
  if (groupBy === DASHBOARD.GROUP_BY.MONTH) {
    return toPeriodKey(date);
  }
  if (groupBy === DASHBOARD.GROUP_BY.WEEK) {
    return `${getISOWeekYear(date)}-W${String(getISOWeek(date)).padStart(ISO_WEEK_PAD, '0')}`;
  }
  return toDateKey(date);
}

/** Summary rows → one series per revenue type or channel, every series on the same buckets. */
export function buildTrends(
  rows: readonly SummaryForTrends[],
  options: TrendOptions,
): { buckets: string[]; series: TrendSeries[] } {
  const bucketSet = new Set<string>();
  const totals = new Map<
    string,
    Map<string, { total: ReturnType<typeof toDecimal>; count: number }>
  >();
  for (const row of rows) {
    const bucket = bucketKey(row.date, options.groupBy);
    bucketSet.add(bucket);
    const key = options.by === DASHBOARD.BY.CHANNEL ? row.channel : row.revenueTypeId;
    const perBucket =
      totals.get(key) ?? new Map<string, { total: ReturnType<typeof toDecimal>; count: number }>();
    const current = perBucket.get(bucket) ?? { total: toDecimal(0), count: 0 };
    perBucket.set(bucket, {
      total: current.total.plus(toDecimal(row.total)),
      count: current.count + row.count,
    });
    totals.set(key, perBucket);
  }
  const buckets = [...bucketSet].sort();
  const series: TrendSeries[] = [...totals.entries()]
    .map(([key, perBucket]) => ({
      key,
      label: options.labels.get(key) ?? key,
      points: buckets.map((bucket): TrendPoint => {
        const point = perBucket.get(bucket);
        return {
          bucket,
          total: (point?.total ?? toDecimal(0)).toFixed(AMOUNT_SCALE),
          count: point?.count ?? 0,
        };
      }),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  return { buckets, series };
}

/** Percentage of `part` over `whole`, or null when there is no whole to compare with. */
export function percent(part: string | number, whole: string | number): number | null {
  const denominator = toDecimal(whole);
  if (denominator.isZero()) {
    return null;
  }
  return Number(toDecimal(part).div(denominator).mul(DASHBOARD_API.PERCENT).toFixed(1));
}

/** The same calendar range one year earlier. */
export function sameRangeLastYear(from: string, to: string): { from: string; to: string } {
  return { from: toDateKey(subYears(new Date(from), 1)), to: toDateKey(subYears(new Date(to), 1)) };
}

/** `YYYY-MM` keys from `from` to `to` inclusive. */
export function periodsBetween(from: string, to: string): string[] {
  const periods: string[] = [];
  let [year, month] = from.split('-').map(Number) as [number, number];
  const [endYear, endMonth] = to.split('-').map(Number) as [number, number];
  while (year < endYear || (year === endYear && month <= endMonth)) {
    periods.push(`${year}-${String(month).padStart(ISO_WEEK_PAD, '0')}`);
    month += 1;
    if (month > MONTHS_PER_YEAR) {
      month = 1;
      year += 1;
    }
  }
  return periods;
}

/** The `count` periods after `period`. */
export function nextPeriods(period: string, count: number): string[] {
  const [year, month] = period.split('-').map(Number) as [number, number];
  const periods: string[] = [];
  let y = year;
  let m = month;
  for (let i = 0; i < count; i += 1) {
    m += 1;
    if (m > MONTHS_PER_YEAR) {
      m = 1;
      y += 1;
    }
    periods.push(`${y}-${String(m).padStart(ISO_WEEK_PAD, '0')}`);
  }
  return periods;
}

/** Ordinary least squares over the monthly totals, projected `horizon` months ahead (D18). */
export function olsForecast(
  history: readonly MonthlyTotal[],
  horizon: number,
): FittedForecast | null {
  if (history.length < DASHBOARD_API.MIN_FORECAST_POINTS) {
    return null;
  }
  const data = history.map((point, index): [number, number] => [index, point.total]);
  const { m, b } = linearRegression(data);
  const line = linearRegressionLine({ m, b });
  const last = history[history.length - 1];
  const projected = nextPeriods(last?.period ?? '', horizon).map((period, offset) => ({
    period,
    total: Math.max(0, line(history.length + offset)),
  }));
  const r2 = rSquared(data, line);
  return { history, projected, slope: m, intercept: b, r2: Number.isFinite(r2) ? r2 : null };
}

/** Holt's linear exponential smoothing: level and trend updated each month, then extrapolated. */
export function holtForecast(
  history: readonly MonthlyTotal[],
  horizon: number,
  alpha: number,
  beta: number,
): FittedForecast | null {
  const [first, second] = history;
  if (
    first === undefined ||
    second === undefined ||
    history.length < DASHBOARD_API.MIN_FORECAST_POINTS
  ) {
    return null;
  }
  let level = first.total;
  let trend = second.total - first.total;
  for (const point of history.slice(1)) {
    const previousLevel = level;
    level = alpha * point.total + (1 - alpha) * (previousLevel + trend);
    trend = beta * (level - previousLevel) + (1 - beta) * trend;
  }
  const last = history[history.length - 1];
  const projected = nextPeriods(last?.period ?? '', horizon).map((period, offset) => ({
    period,
    total: Math.max(0, level + trend * (offset + 1)),
  }));
  return { history, projected, slope: trend, intercept: level, r2: null };
}

/** Standard score of `value` against the samples; null when fewer than the minimum or no spread. */
export function zScore(
  value: number,
  samples: readonly number[],
  minimumSamples: number,
): number | null {
  if (samples.length < minimumSamples) {
    return null;
  }
  const deviation = sampleStandardDeviation([...samples]);
  if (!Number.isFinite(deviation) || deviation === 0) {
    return null;
  }
  return (value - mean([...samples])) / deviation;
}

/**
 * Severity for an anomaly. `direction` −1 flags values below the baseline (collections drop),
 * +1 flags values above it (reversal spike). Thresholds are absolute z-scores.
 */
export function anomalyVerdict(
  value: number,
  samples: readonly number[],
  direction: -1 | 1,
  warning: number,
  critical: number,
  minimumSamples: number,
): AnomalyVerdict {
  const z = zScore(value, samples, minimumSamples);
  const baseline = samples.length > 0 ? mean([...samples]) : 0;
  if (z === null) {
    return { z: null, mean: baseline, severity: null };
  }
  const signed = z * direction;
  if (signed >= critical) {
    return { z, mean: baseline, severity: AlertSeverity.CRITICAL };
  }
  if (signed >= warning) {
    return { z, mean: baseline, severity: AlertSeverity.WARNING };
  }
  return { z, mean: baseline, severity: null };
}

/** Fraction of the UTC day elapsed, used to scale full-day baselines to "so far". */
export function dayFraction(now: Date): number {
  const start = new Date(toDateKey(now));
  const elapsedHours = (now.getTime() - start.getTime()) / MS_PER_HOUR;
  return Math.min(1, Math.max(0, elapsedHours / DASHBOARD_API.HOURS_PER_DAY));
}
