import type { DashboardBy, ForecastModel } from '../constants/dashboard.constants';
import type { AlertSeverity, AlertType, PaymentChannel } from '../enums';
import type { MoneyString } from './registry.types';

/** KPI cards; every money value is local currency, aggregated server-side from summaries. */
export interface DashboardOverview {
  readonly from: string;
  readonly to: string;
  readonly collected: MoneyString;
  readonly collectedCount: number;
  readonly collectedLastYear: MoneyString;
  /** (collected − last year) / last year, percent, or null without a baseline. */
  readonly changeVsLastYearPct: number | null;
  readonly reversed: MoneyString;
  readonly reversedCount: number;
  readonly outstandingAssessments: MoneyString;
  readonly outstandingWater: MoneyString;
  readonly waterBilled: MoneyString;
  readonly waterCollected: MoneyString;
  /** Water collected / billed, percent, or null when nothing was billed. */
  readonly collectionEfficiencyPct: number | null;
  readonly target: MoneyString;
  /** Tax collected / target, percent, or null without targets. */
  readonly targetAttainmentPct: number | null;
}

export interface TrendPoint {
  readonly bucket: string;
  readonly total: MoneyString;
  readonly count: number;
}

export interface TrendSeries {
  readonly key: string;
  readonly label: string;
  readonly points: readonly TrendPoint[];
}

export interface TrendsResponse {
  readonly groupBy: string;
  readonly by: DashboardBy;
  readonly buckets: readonly string[];
  readonly series: readonly TrendSeries[];
}

export interface TargetAttainmentRow {
  readonly period: string;
  readonly revenueTypeId: string;
  readonly revenueType: { readonly code: string; readonly name: string };
  readonly collected: MoneyString;
  readonly target: MoneyString;
  readonly attainmentPct: number | null;
}

export interface EfficiencyRow {
  readonly period: string;
  readonly billed: MoneyString;
  readonly collected: MoneyString;
  readonly efficiencyPct: number | null;
}

export interface ForecastPoint {
  readonly period: string;
  readonly total: MoneyString;
  readonly forecast: boolean;
}

export interface ForecastResult {
  readonly model: ForecastModel;
  readonly key: string;
  readonly label: string;
  readonly points: readonly ForecastPoint[];
  readonly slope: number;
  readonly intercept: number;
  readonly r2: number | null;
  readonly n: number;
  readonly caveat: string;
}

export interface ForecastResponse {
  readonly model: ForecastModel;
  readonly horizonMonths: number;
  readonly series: readonly ForecastResult[];
}

export interface AlertView {
  readonly id: string;
  readonly type: AlertType;
  readonly severity: AlertSeverity;
  readonly title: string;
  readonly message: string;
  readonly data: unknown;
  readonly createdAt: Date | string;
  readonly acknowledgedById: string | null;
  readonly acknowledgedAt: Date | string | null;
}

export interface RevenueTargetView {
  readonly id: string;
  readonly period: string;
  readonly revenueTypeId: string;
  readonly revenueType: { readonly code: string; readonly name: string };
  readonly amount: MoneyString;
}

export interface CollectionChannelBreakdown {
  readonly channel: PaymentChannel;
  readonly total: MoneyString;
}
