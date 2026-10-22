import type { BillingCycleStats, TierLine } from '@ircub/shared';

import { toDecimal } from '../../common/money/money.rules';

import { accountOutstanding } from './billing/billing.rules';
import { isReleasedBill } from './bills/bills.rules';

import type { WaterAccountResponseDto } from './accounts/dto/water-account.response.dto';
import type { BillingCycleResponseDto } from './billing/dto/billing-cycle.response.dto';
import type { BillResponseDto } from './bills/dto/bill.response.dto';
import type { MeterResponseDto } from './meters/dto/meter.response.dto';
import type { MeterReadingResponseDto } from './readings/dto/meter-reading.response.dto';
import type { TariffCategoryResponseDto } from './tariffs/dto/tariff-category.response.dto';
import type {
  BillWithRelations,
  CycleRow,
  MeterWithLatest,
  ReadingWithMeter,
  TariffWithTiers,
  WaterAccountWithRelations,
} from './water-views.types';
import type { Prisma } from '@prisma/client';

export const TARIFF_INCLUDE = {
  tiers: { orderBy: { fromUnit: 'asc' } },
} satisfies Prisma.TariffCategoryInclude;
export const READING_INCLUDE = {
  meter: {
    select: { serial: true, accountId: true, account: { select: { accountNumber: true } } },
  },
} satisfies Prisma.MeterReadingInclude;
export const METER_INCLUDE = {
  readings: {
    orderBy: [{ readingDate: 'desc' }, { createdAt: 'desc' }],
    take: 1,
    include: READING_INCLUDE,
  },
} satisfies Prisma.MeterInclude;
export const ACCOUNT_INCLUDE = {
  payer: { select: { id: true, tin: true, name: true } },
  tariffCategory: { select: { id: true, code: true, name: true } },
  meters: { include: METER_INCLUDE, orderBy: { installedAt: 'asc' } },
  bills: { select: { consumptionCharge: true, fixedCharge: true, paidAmount: true, status: true } },
} satisfies Prisma.WaterAccountInclude;
export const BILL_INCLUDE = {
  account: { select: { id: true, accountNumber: true, serviceAddress: true } },
  payer: { select: { id: true, tin: true, name: true } },
  cycle: { select: { period: true } },
} satisfies Prisma.BillInclude;

export function toTariffView(row: TariffWithTiers): TariffCategoryResponseDto {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    fixedCharge: row.fixedCharge.toFixed(),
    active: row.active,
    tiers: row.tiers.map((tier) => ({
      id: tier.id,
      fromUnit: tier.fromUnit,
      toUnit: tier.toUnit,
      ratePerUnit: tier.ratePerUnit.toFixed(),
    })),
  };
}

export function toReadingView(row: ReadingWithMeter): MeterReadingResponseDto {
  return {
    id: row.id,
    meterId: row.meterId,
    meterSerial: row.meter.serial,
    accountId: row.meter.accountId,
    accountNumber: row.meter.account.accountNumber,
    readingDate: row.readingDate,
    readingValue: row.readingValue,
    type: row.type,
    consumption: row.consumption,
    source: row.source,
    abnormal: row.abnormal,
    abnormalReason: row.abnormalReason,
    createdAt: row.createdAt,
  };
}

export function toMeterView(row: MeterWithLatest): MeterResponseDto {
  const latest = row.readings[0];
  return {
    id: row.id,
    serial: row.serial,
    accountId: row.accountId,
    maxDigits: row.maxDigits,
    initialReading: row.initialReading,
    installedAt: row.installedAt,
    status: row.status,
    replacesMeterId: row.replacesMeterId,
    lastReading: latest === undefined ? null : toReadingView(latest),
  };
}

export function toAccountView(row: WaterAccountWithRelations): WaterAccountResponseDto {
  const outstanding = accountOutstanding(row.bills.filter((bill) => isReleasedBill(bill.status)));
  return {
    id: row.id,
    accountNumber: row.accountNumber,
    payer: row.payer,
    tariffCategory: row.tariffCategory,
    serviceAddress: row.serviceAddress,
    status: row.status,
    openedAt: row.openedAt,
    meters: row.meters.map(toMeterView),
    outstanding: outstanding.toFixed(),
  };
}

export function toBillView(row: BillWithRelations): BillResponseDto {
  const outstanding = toDecimal(row.totalDue).minus(toDecimal(row.paidAmount));
  return {
    id: row.id,
    billNumber: row.billNumber,
    cycleId: row.cycleId,
    period: row.cycle.period,
    account: row.account,
    payer: row.payer,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    previousReading: row.previousReading,
    currentReading: row.currentReading,
    consumption: row.consumption,
    tierBreakdown: row.tierBreakdown as unknown as TierLine[],
    consumptionCharge: row.consumptionCharge.toFixed(),
    fixedCharge: row.fixedCharge.toFixed(),
    arrears: row.arrears.toFixed(),
    paymentsApplied: row.paymentsApplied.toFixed(),
    totalDue: row.totalDue.toFixed(),
    paidAmount: row.paidAmount.toFixed(),
    outstanding: (outstanding.lt(0) ? toDecimal(0) : outstanding).toFixed(),
    currency: row.currency,
    status: row.status,
    flagged: row.flagged,
    flagReason: row.flagReason,
    flagNote: row.flagNote,
    hasPdf: row.pdfPath !== null,
    dueDate: row.dueDate,
    releasedAt: row.releasedAt,
  };
}

function toStatsDto(stats: BillingCycleStats): BillingCycleResponseDto['stats'] {
  return {
    accounts: stats.accounts,
    billed: stats.billed,
    flagged: stats.flagged,
    skipped: [...stats.skipped],
    totalBilled: stats.totalBilled,
    ...(stats.held === undefined ? {} : { held: stats.held }),
    ...(stats.notificationsSent === undefined
      ? {}
      : { notificationsSent: stats.notificationsSent }),
  };
}

export function toCycleView(row: CycleRow): BillingCycleResponseDto {
  return {
    id: row.id,
    period: row.period,
    status: row.status,
    runAt: row.runAt,
    releasedAt: row.releasedAt,
    stats: toStatsDto(row.stats as unknown as BillingCycleStats),
  };
}
