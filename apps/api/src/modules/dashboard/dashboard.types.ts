import type {
  AlertSeverity,
  AlertType,
  Currency,
  DashboardBy,
  DashboardGroupBy,
  PaymentChannel,
} from '@ircub/shared';

import type { DecimalLike } from '../../common/money/money.types';
import type { Prisma } from '@prisma/client';

/** One payment as the aggregator sees it. */
export interface PaymentForSummary {
  readonly paidAt: Date;
  readonly localAmount: DecimalLike;
  readonly currency: Currency;
  readonly channel: PaymentChannel;
  readonly revenueTypeId: string;
}

/** One approved reversal: counted on the day it was decided. */
export interface ReversalForSummary {
  readonly decidedAt: Date;
  readonly localAmount: DecimalLike;
  readonly channel: PaymentChannel;
  readonly revenueTypeId: string;
}

/** A released bill's own charges; `totalDue` would count carried arrears once per cycle. */
export interface BillForSummary {
  readonly periodEnd: Date;
  readonly consumptionCharge: DecimalLike;
  readonly fixedCharge: DecimalLike;
}

export interface BillPaymentForSummary {
  readonly paidAt: Date;
  readonly localAmount: DecimalLike;
}

/** One `DailyCollectionSummary` row to write. */
export interface CollectionSummaryRow {
  readonly date: string;
  readonly revenueTypeId: string;
  readonly channel: PaymentChannel;
  readonly total: string;
  readonly count: number;
  readonly reversedTotal: string;
  readonly reversedCount: number;
}

export interface BillingSummaryRow {
  readonly date: string;
  readonly billedTotal: string;
  readonly collectedTotal: string;
}

/** A summary row as read back for trends and totals. */
export interface SummaryForTrends {
  readonly date: Date;
  readonly revenueTypeId: string;
  readonly channel: PaymentChannel;
  readonly total: DecimalLike;
  readonly count: number;
}

export interface TrendOptions {
  readonly groupBy: DashboardGroupBy;
  readonly by: DashboardBy;
  readonly labels: ReadonlyMap<string, string>;
}

export interface MonthlyTotal {
  readonly period: string;
  readonly total: number;
}

export interface FittedForecast {
  readonly history: readonly MonthlyTotal[];
  readonly projected: readonly MonthlyTotal[];
  readonly slope: number;
  readonly intercept: number;
  readonly r2: number | null;
}

export interface AnomalyVerdict {
  readonly z: number | null;
  readonly mean: number;
  readonly severity: AlertSeverity | null;
}

export interface RaiseAlertInput {
  readonly type: AlertType;
  readonly severity: AlertSeverity;
  readonly title: string;
  readonly message: string;
  readonly data: Prisma.InputJsonObject;
  /** Open alerts with the same type and key are not raised again (de-duplication). */
  readonly dedupeKey: string;
}

export interface TargetsImportContext {
  readonly typeIdByCode: ReadonlyMap<string, string>;
  readonly seen: Set<string>;
}

export type AlertRow = Prisma.AlertGetPayload<object>;

export type RevenueTargetWithType = Prisma.RevenueTargetGetPayload<{
  include: { revenueType: { select: { code: true; name: true } } };
}>;
