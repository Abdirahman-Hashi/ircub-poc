import type {
  BillingCycleStatus,
  BillStatus,
  Currency,
  MeterStatus,
  NotificationChannel,
  NotificationStatus,
  ReadingSource,
  ReadingType,
  WaterAccountStatus,
} from '../enums';
import type { MoneyString, PayerView } from './registry.types';

export interface TariffTierView {
  readonly id: string;
  readonly fromUnit: number;
  readonly toUnit: number | null;
  readonly ratePerUnit: MoneyString;
}

export interface TariffCategoryView {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly fixedCharge: MoneyString;
  readonly active: boolean;
  readonly tiers: readonly TariffTierView[];
}

export interface MeterView {
  readonly id: string;
  readonly serial: string;
  readonly accountId: string;
  readonly maxDigits: number;
  readonly initialReading: number;
  readonly installedAt: Date | string;
  readonly status: MeterStatus;
  readonly replacesMeterId: string | null;
  readonly lastReading: MeterReadingView | null;
}

export interface WaterAccountView {
  readonly id: string;
  readonly accountNumber: string;
  readonly payer: Pick<PayerView, 'id' | 'tin' | 'name'>;
  readonly tariffCategory: Pick<TariffCategoryView, 'id' | 'code' | 'name'>;
  readonly serviceAddress: string;
  readonly status: WaterAccountStatus;
  readonly openedAt: Date | string;
  readonly meters: readonly MeterView[];
  readonly outstanding: MoneyString;
}

export interface MeterReadingView {
  readonly id: string;
  readonly meterId: string;
  readonly meterSerial: string;
  readonly accountId: string;
  readonly accountNumber: string;
  readonly readingDate: Date | string;
  readonly readingValue: number;
  readonly type: ReadingType;
  readonly consumption: number;
  readonly source: ReadingSource;
  readonly abnormal: boolean;
  readonly abnormalReason: string | null;
  readonly createdAt: Date | string;
}

/** What the reading form shows before saving: previous reading and the computed outcome. */
export interface ReadingPreview {
  readonly meterId: string;
  readonly previousReading: number;
  readonly previousDate: Date | string | null;
  readonly consumption: number;
  readonly abnormal: boolean;
  readonly abnormalReason: string | null;
}

export interface TierLine {
  readonly from: number;
  readonly to: number | null;
  readonly units: number;
  readonly rate: MoneyString;
  readonly amount: MoneyString;
}

export interface BillView {
  readonly id: string;
  readonly billNumber: string;
  readonly cycleId: string;
  readonly period: string;
  readonly account: Pick<WaterAccountView, 'id' | 'accountNumber' | 'serviceAddress'>;
  readonly payer: Pick<PayerView, 'id' | 'tin' | 'name'>;
  readonly periodStart: Date | string;
  readonly periodEnd: Date | string;
  readonly previousReading: number;
  readonly currentReading: number;
  readonly consumption: number;
  readonly tierBreakdown: readonly TierLine[];
  readonly consumptionCharge: MoneyString;
  readonly fixedCharge: MoneyString;
  readonly arrears: MoneyString;
  readonly paymentsApplied: MoneyString;
  readonly totalDue: MoneyString;
  readonly paidAmount: MoneyString;
  readonly outstanding: MoneyString;
  readonly currency: Currency;
  readonly status: BillStatus;
  readonly flagged: boolean;
  readonly flagReason: string | null;
  readonly flagNote: string | null;
  readonly hasPdf: boolean;
  readonly dueDate: Date | string;
  readonly releasedAt: Date | string | null;
}

export interface SkippedAccount {
  readonly accountNumber: string;
  readonly reason: string;
}

/** Exception report stored on the cycle (D14). */
export interface BillingCycleStats {
  readonly accounts: number;
  readonly billed: number;
  readonly flagged: number;
  readonly skipped: readonly SkippedAccount[];
  readonly totalBilled: MoneyString;
  readonly notificationsSent?: number;
}

export interface BillingCycleView {
  readonly id: string;
  readonly period: string;
  readonly status: BillingCycleStatus;
  readonly runAt: Date | string;
  readonly releasedAt: Date | string | null;
  readonly stats: BillingCycleStats;
}

export type StatementLineKind = 'OPENING' | 'BILL' | 'PAYMENT';

export interface StatementLine {
  readonly date: Date | string;
  readonly kind: StatementLineKind;
  readonly reference: string;
  readonly description: string;
  readonly debit: MoneyString;
  readonly credit: MoneyString;
  readonly balance: MoneyString;
}

export interface StatementView {
  readonly account: Pick<WaterAccountView, 'id' | 'accountNumber' | 'serviceAddress'>;
  readonly payer: Pick<PayerView, 'id' | 'tin' | 'name'>;
  readonly from: Date | string;
  readonly to: Date | string;
  readonly currency: Currency;
  readonly openingBalance: MoneyString;
  readonly closingBalance: MoneyString;
  readonly lines: readonly StatementLine[];
}

export interface NotificationView {
  readonly id: string;
  readonly channel: NotificationChannel;
  readonly to: string;
  readonly subject: string | null;
  readonly body: string;
  readonly status: NotificationStatus;
  readonly relatedType: string | null;
  readonly relatedId: string | null;
  readonly sentAt: Date | string | null;
  readonly error: string | null;
  readonly createdAt: Date | string;
}

/** Water section of the payer 360° view. */
export interface PayerWaterSummary {
  readonly account: WaterAccountView;
  readonly bills: readonly BillView[];
}
