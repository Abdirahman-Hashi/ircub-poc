import { faker } from '@faker-js/faker';
import { addDays, subMonths } from 'date-fns';
import { Decimal } from 'decimal.js';

import {
  BillingCycleStatus,
  BillStatus,
  Currency,
  MeterStatus,
  PaymentChannel,
  PaymentStatus,
  ReadingSource,
  ReadingType,
} from '@ircub/shared';

import { formatControlNumber } from '../../src/common/ids/ids.rules';
import { roundMoney } from '../../src/common/money/money.rules';
import {
  arrearsOf,
  periodBounds,
  periodOf,
  totalDueOf,
} from '../../src/modules/water/billing/billing.rules';
import {
  computeConsumption,
  evaluateAbnormal,
} from '../../src/modules/water/readings/readings.rules';
import { computeTieredCharge } from '../../src/modules/water/tariffs/tariffs.rules';
import { FLAG_REASON } from '../../src/modules/water/water.constants';

import { SEED_FX_RATE, WATER_DEMO } from './seed.constants';
import { requireValue } from './seed.utils';

import type { ExtendedPrismaClient } from '../../src/prisma/prisma.types';
import type { Prisma } from '@prisma/client';

/** Tariff categories (D14): tiers quoted in SOS as USD-equivalents × the seed FX rate. */
export async function seedTariffs(prisma: ExtendedPrismaClient): Promise<number> {
  for (const category of WATER_DEMO.TARIFFS) {
    const existing = await prisma.tariffCategory.findUnique({ where: { code: category.code } });
    if (existing !== null) {
      continue;
    }
    await prisma.tariffCategory.create({
      data: {
        code: category.code,
        name: category.name,
        fixedCharge: roundMoney(new Decimal(category.fixedChargeUsd).mul(SEED_FX_RATE)).toFixed(),
        tiers: {
          create: category.tiersUsd.map((tier) => ({
            fromUnit: tier.from,
            toUnit: tier.to,
            ratePerUnit: roundMoney(new Decimal(tier.rateUsd).mul(SEED_FX_RATE)).toFixed(),
          })),
        },
      },
    });
  }
  return WATER_DEMO.TARIFFS.length;
}

/**
 * Accounts, meters, 12 months of readings (seasonal), 2 rollovers, 1 replacement, 3 abnormal
 * readings in the latest month, and RELEASED cycles for the previous 3 months with ~60 % of
 * bills paid. The current month has readings but no cycle. Skipped when accounts exist.
 */
export async function seedWaterDemo(prisma: ExtendedPrismaClient): Promise<string> {
  if ((await prisma.waterAccount.count()) > 0) {
    return 'present, skipped';
  }
  const [payers, tariffs, users] = await Promise.all([
    prisma.payer.findMany({
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: WATER_DEMO.PAYERS,
    }),
    prisma.tariffCategory.findMany({ include: { tiers: true } }),
    prisma.user.findMany({ select: { id: true, email: true } }),
  ]);
  const waterOfficerId = requireValue(
    new Map(users.map((u) => [u.email, u.id])),
    WATER_DEMO.WATER_OFFICER_EMAIL,
    'user',
  );
  const domestic = requireValue(new Map(tariffs.map((t) => [t.code, t])), 'DOMESTIC', 'tariff');
  const commercial = requireValue(new Map(tariffs.map((t) => [t.code, t])), 'COMMERCIAL', 'tariff');

  // ── Accounts + meters ────────────────────────────────────────────────────────
  const accountRows: Prisma.WaterAccountCreateManyInput[] = [];
  for (let i = 0; i < WATER_DEMO.ACCOUNTS; i += 1) {
    const payer = payers[i % payers.length];
    if (payer === undefined) {
      break;
    }
    const tariff = i % WATER_DEMO.COMMERCIAL_EVERY === 0 ? commercial : domestic;
    accountRows.push({
      accountNumber: `${WATER_DEMO.ACCOUNT_PREFIX}${String(i + 1).padStart(WATER_DEMO.ACCOUNT_DIGITS, '0')}`,
      payerId: payer.id,
      tariffCategoryId: tariff.id,
      serviceAddress: `${faker.location.streetAddress()}, ${faker.location.city()}`,
      openedAt: subMonths(new Date(), WATER_DEMO.MONTHS + 1),
    });
  }
  await prisma.waterAccount.createMany({ data: accountRows });
  const accounts = await prisma.waterAccount.findMany({
    orderBy: { accountNumber: 'asc' },
    include: { tariffCategory: { include: { tiers: true } } },
  });
  await prisma.meter.createMany({
    data: accounts.map((account, index) => ({
      accountId: account.id,
      serial: `${WATER_DEMO.METER_PREFIX}${String(index + 1).padStart(WATER_DEMO.METER_DIGITS, '0')}`,
      maxDigits: WATER_DEMO.METER_DIGITS_ON_DIAL,
      initialReading: faker.number.int({ min: 0, max: 5_000 }),
      installedAt: account.openedAt,
    })),
  });
  const meters = await prisma.meter.findMany({ orderBy: { serial: 'asc' } });

  // ── Readings: monthly on the 1st, seasonal, with rollover / replacement / abnormal cases ──
  const now = new Date();
  const thisPeriod = periodOf(now);
  const readingRows: Prisma.MeterReadingCreateManyInput[] = [];
  const consumptionByMeter = new Map<string, number[]>();
  const rolloverMeters = new Set(meters.slice(0, WATER_DEMO.ROLLOVERS).map((m) => m.id));
  const abnormalMeters = new Set(
    meters.slice(WATER_DEMO.ROLLOVERS, WATER_DEMO.ROLLOVERS + WATER_DEMO.ABNORMAL).map((m) => m.id),
  );
  const replacementMeter = meters[WATER_DEMO.ROLLOVERS + WATER_DEMO.ABNORMAL];
  const capacity = WATER_DEMO.DECIMAL_RADIX ** WATER_DEMO.METER_DIGITS_ON_DIAL;

  for (const meter of meters) {
    const account = accounts.find((a) => a.id === meter.accountId);
    const base =
      account?.tariffCategory.code === 'COMMERCIAL'
        ? faker.number.int({ min: 60, max: 140 })
        : faker.number.int({ min: 8, max: 35 });
    // Rollover meters start near the top of the dial so they wrap within the year.
    let value = rolloverMeters.has(meter.id) ? capacity - base * 4 : meter.initialReading;
    let previous = value;
    if (rolloverMeters.has(meter.id)) {
      await prisma.meter.update({ where: { id: meter.id }, data: { initialReading: value } });
    }
    const history: number[] = [];
    for (let m: number = WATER_DEMO.MONTHS; m >= 0; m -= 1) {
      const date = periodBounds(periodOf(subMonths(now, m))).start;
      const season = WATER_DEMO.SEASONALITY[date.getUTCMonth()] ?? 1;
      let consumption = Math.max(
        0,
        Math.round(base * season * faker.number.float({ min: 0.85, max: 1.15 })),
      );
      if (m === 0 && abnormalMeters.has(meter.id)) {
        consumption = Math.round(consumption * WATER_DEMO.ABNORMAL_MULTIPLIER);
      }
      const next = value + consumption;
      const wraps = next >= capacity;
      const current = wraps ? next - capacity : next;
      const type = wraps ? ReadingType.ROLLOVER : ReadingType.NORMAL;
      const computed = computeConsumption({
        previousReading: previous,
        currentReading: current,
        type,
        meter: { maxDigits: WATER_DEMO.METER_DIGITS_ON_DIAL, initialReading: meter.initialReading },
      });
      const units = computed.ok ? computed.consumption : consumption;
      const abnormal = evaluateAbnormal(
        units,
        [...history].reverse(),
        WATER_DEMO.ABNORMAL_THRESHOLD_PCT,
        WATER_DEMO.ABNORMAL_HISTORY_MONTHS,
      );
      readingRows.push({
        meterId: meter.id,
        readingDate: date,
        readingValue: current,
        type,
        consumption: units,
        source: ReadingSource.MANUAL,
        capturedById: waterOfficerId,
        abnormal: abnormal.abnormal,
        abnormalReason: abnormal.reason,
      });
      history.push(units);
      previous = current;
      value = current;
    }
    consumptionByMeter.set(meter.id, history);
  }
  await prisma.meterReading.createMany({ data: readingRows });

  // Replacement: one meter replaced last month; new meter gets a REPLACEMENT reading this month.
  if (replacementMeter !== undefined) {
    const lastMonth = periodBounds(periodOf(subMonths(now, 1))).start;
    await prisma.meter.update({
      where: { id: replacementMeter.id },
      data: { status: MeterStatus.REPLACED },
    });
    const replacement = await prisma.meter.create({
      data: {
        accountId: replacementMeter.accountId,
        serial: `${WATER_DEMO.METER_PREFIX}R${String(meters.length + 1).padStart(WATER_DEMO.METER_DIGITS - 1, '0')}`,
        maxDigits: WATER_DEMO.METER_DIGITS_ON_DIAL,
        initialReading: WATER_DEMO.REPLACEMENT_INITIAL,
        installedAt: addDays(lastMonth, 1),
        replacesMeterId: replacementMeter.id,
      },
    });
    await prisma.meterReading.deleteMany({
      where: { meterId: replacementMeter.id, readingDate: { gte: periodBounds(thisPeriod).start } },
    });
    await prisma.meterReading.create({
      data: {
        meterId: replacement.id,
        readingDate: periodBounds(thisPeriod).start,
        readingValue: WATER_DEMO.REPLACEMENT_INITIAL + WATER_DEMO.REPLACEMENT_CONSUMPTION,
        type: ReadingType.REPLACEMENT,
        consumption: WATER_DEMO.REPLACEMENT_CONSUMPTION,
        source: ReadingSource.MANUAL,
        capturedById: waterOfficerId,
      },
    });
  }

  // ── Released cycles for the previous 3 months, computed with the same rules as the service ──
  const periods = Array.from({ length: WATER_DEMO.RELEASED_CYCLES }, (_, i) =>
    periodOf(subMonths(now, WATER_DEMO.RELEASED_CYCLES - i)),
  );
  let bills = 0;
  let payments = 0;
  for (const period of periods) {
    const bounds = periodBounds(period);
    const releasedAt = addDays(bounds.end, 1);
    const cycle = await prisma.billingCycle.create({
      data: {
        period,
        status: BillingCycleStatus.RELEASED,
        runById: waterOfficerId,
        runAt: releasedAt,
        releasedById: waterOfficerId,
        releasedAt,
        stats: {},
      },
    });
    const sequences = await allocateControlNumbers(prisma, accounts.length);
    let billed = 0;
    let totalBilled = new Decimal(0);
    const skipped: { accountNumber: string; reason: string }[] = [];
    for (const [index, account] of accounts.entries()) {
      const meter = meters.find((m) => m.accountId === account.id);
      const readings = readingRows.filter(
        (r) =>
          r.meterId === meter?.id &&
          new Date(r.readingDate as Date) >= bounds.start &&
          new Date(r.readingDate as Date) <= bounds.end,
      );
      const reading = readings[readings.length - 1];
      const sequence = sequences[index];
      if (meter === undefined || reading === undefined || sequence === undefined) {
        skipped.push({ accountNumber: account.accountNumber, reason: 'NO_READING_IN_PERIOD' });
        continue;
      }
      const previous = readingRows
        .filter((r) => r.meterId === meter.id && new Date(r.readingDate as Date) < bounds.start)
        .pop();
      const charge = computeTieredCharge(reading.consumption, account.tariffCategory.tiers);
      const previousBills = await prisma.bill.findMany({
        where: { accountId: account.id },
        select: { consumptionCharge: true, fixedCharge: true, paidAmount: true },
      });
      const arrears = arrearsOf(previousBills);
      const fixedCharge = roundMoney(account.tariffCategory.fixedCharge);
      const totalDue = totalDueOf(charge.consumptionCharge, fixedCharge, arrears);
      const bill = await prisma.bill.create({
        data: {
          billNumber: formatControlNumber(sequence),
          cycleId: cycle.id,
          accountId: account.id,
          payerId: account.payerId,
          periodStart: bounds.start,
          periodEnd: bounds.end,
          previousReading: previous?.readingValue ?? meter.initialReading,
          currentReading: reading.readingValue,
          consumption: reading.consumption,
          tierBreakdown: charge.lines.map((l) => ({
            from: l.from,
            to: l.to,
            units: l.units,
            rate: l.rate.toFixed(),
            amount: l.amount.toFixed(),
          })) as unknown as Prisma.InputJsonValue,
          consumptionCharge: charge.consumptionCharge.toFixed(),
          fixedCharge: fixedCharge.toFixed(),
          arrears: arrears.toFixed(),
          totalDue: totalDue.toFixed(),
          currency: Currency.SOS,
          status: BillStatus.RELEASED,
          dueDate: addDays(bounds.end, WATER_DEMO.DUE_DAYS),
          releasedAt,
        },
      });
      billed += 1;
      totalBilled = totalBilled.plus(totalDue);
      if (faker.datatype.boolean({ probability: WATER_DEMO.PAID_RATIO })) {
        const channel = faker.helpers.arrayElement([
          PaymentChannel.CASH,
          PaymentChannel.MOBILE_MONEY,
          PaymentChannel.BANK,
        ]);
        const candidate = addDays(
          releasedAt,
          faker.number.int({ min: 1, max: WATER_DEMO.DUE_DAYS }),
        );
        const paidAt =
          candidate > new Date()
            ? faker.date.between({ from: releasedAt, to: new Date() })
            : candidate;
        await prisma.payment.create({
          data: {
            controlNumber: bill.billNumber,
            billId: bill.id,
            payerId: account.payerId,
            channel,
            channelTxnRef:
              channel === PaymentChannel.CASH
                ? null
                : `${channel === PaymentChannel.BANK ? 'BNK' : 'MM'}-W${faker.string.alphanumeric({ length: 9, casing: 'upper' })}`,
            amount: totalDue.toFixed(),
            currency: Currency.SOS,
            localAmount: totalDue.toFixed(),
            status: PaymentStatus.CONFIRMED,
            paidAt,
            capturedById: waterOfficerId,
            createdAt: paidAt,
          },
        });
        await prisma.bill.update({
          where: { id: bill.id },
          data: { paidAmount: totalDue.toFixed(), status: BillStatus.PAID },
        });
        payments += 1;
      }
      bills += 1;
    }
    await prisma.billingCycle.update({
      where: { id: cycle.id },
      data: {
        stats: {
          accounts: accounts.length,
          billed,
          flagged: 0,
          skipped,
          totalBilled: roundMoney(totalBilled).toFixed(),
        } as unknown as Prisma.InputJsonValue,
      },
    });
  }
  // Mark the abnormal flag reason text in the way the service does (for the demo's flagged bills next run).
  await prisma.meterReading.updateMany({
    where: { abnormal: true, abnormalReason: null },
    data: { abnormalReason: FLAG_REASON.ABNORMAL_CONSUMPTION },
  });

  return `${accounts.length} accounts, ${meters.length + 1} meters, ${readingRows.length + 1} readings, ${periods.length} released cycles, ${bills} bills, ${payments} payments`;
}

async function allocateControlNumbers(
  prisma: ExtendedPrismaClient,
  count: number,
): Promise<bigint[]> {
  await prisma.controlNumber.createMany({
    data: Array.from({ length: count }, () => ({ purpose: 'BILL' as const })),
  });
  const rows = await prisma.controlNumber.findMany({
    where: { purpose: 'BILL' },
    orderBy: { id: 'desc' },
    take: count,
    select: { id: true },
  });
  return rows.map((row) => row.id).reverse();
}
