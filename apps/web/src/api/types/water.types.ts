import type {
  BillStatus,
  BillingCycleStatus,
  ReadingSource,
  ReadingType,
  WaterAccountStatus,
} from '@ircub/shared';

export interface TariffTierInput {
  readonly fromUnit: number;
  readonly toUnit: number | null;
  readonly ratePerUnit: string;
}

export interface TariffInput {
  readonly code: string;
  readonly name: string;
  readonly fixedCharge: string;
  readonly tiers: readonly TariffTierInput[];
}

export interface WaterAccountListParams {
  readonly page: number;
  readonly pageSize: number;
  readonly search?: string;
  readonly payerId?: string;
  readonly tariffCategoryId?: string;
  readonly status?: WaterAccountStatus;
}

export interface CreateWaterAccountInput {
  readonly payerId: string;
  readonly tariffCategoryId: string;
  readonly serviceAddress: string;
  readonly meterSerial?: string;
  readonly initialReading?: number;
}

export interface ReplaceMeterInput {
  readonly newSerial: string;
  readonly initialReading: number;
}

export interface ReadingInput {
  readonly meterId: string;
  readonly readingDate: string;
  readonly readingValue: number;
  readonly type?: ReadingType;
}

export interface ReadingListParams {
  readonly page: number;
  readonly pageSize: number;
  readonly accountId?: string;
  readonly meterId?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly abnormal?: string;
  readonly source?: ReadingSource;
}

export interface BillingCycleListParams {
  readonly page: number;
  readonly pageSize: number;
  readonly status?: BillingCycleStatus;
}

export interface BillListParams {
  readonly page: number;
  readonly pageSize: number;
  readonly cycleId?: string;
  readonly accountId?: string;
  readonly payerId?: string;
  readonly status?: BillStatus;
  readonly flagged?: string;
}

export interface StatementParams {
  readonly from?: string;
  readonly to?: string;
}
