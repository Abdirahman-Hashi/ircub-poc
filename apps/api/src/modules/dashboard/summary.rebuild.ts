import { BillStatus, PaymentStatus, REVENUE_TYPE_CODES, ReversalStatus } from '@ircub/shared';

import { utcDayBounds } from '../reconciliation/reconciliation.rules';

import { aggregateBilling, aggregateCollections } from './dashboard.rules';

import type { PaymentForSummary, ReversalForSummary } from './dashboard.types';
import type { PrismaService } from '../../prisma/prisma.service';
import type { TransactionClient } from '../../prisma/prisma.types';

/**
 * Recomputes `DailyCollectionSummary` and `DailyBillingSummary` for every day in
 * `[from, to]` from the source tables (D18). A plain function so the seed can call it too.
 * Returns the number of collection rows written.
 */
export async function rebuildDailySummaries(
  prisma: PrismaService | TransactionClient,
  from: string,
  to: string,
): Promise<number> {
  const { start } = utcDayBounds(from);
  const { end } = utcDayBounds(to);
  const water = await prisma.revenueType.findUnique({
    where: { code: REVENUE_TYPE_CODES.WATER },
    select: { id: true },
  });

  const payments = await prisma.payment.findMany({
    where: {
      status: { in: [PaymentStatus.CONFIRMED, PaymentStatus.REVERSED] },
      paidAt: { gte: start, lt: end },
    },
    select: {
      paidAt: true,
      localAmount: true,
      currency: true,
      channel: true,
      billId: true,
      assessment: { select: { revenueTypeId: true } },
    },
  });
  const reversals = await prisma.reversal.findMany({
    where: { status: ReversalStatus.APPROVED, decidedAt: { gte: start, lt: end } },
    select: {
      decidedAt: true,
      payment: {
        select: {
          localAmount: true,
          channel: true,
          assessment: { select: { revenueTypeId: true } },
        },
      },
    },
  });
  const bills = await prisma.bill.findMany({
    where: {
      status: { in: [BillStatus.RELEASED, BillStatus.PART_PAID, BillStatus.PAID] },
      periodEnd: { gte: start, lt: end },
    },
    select: { periodEnd: true, totalDue: true },
  });

  const forSummary: PaymentForSummary[] = [];
  for (const payment of payments) {
    const revenueTypeId = payment.assessment?.revenueTypeId ?? water?.id ?? null;
    if (payment.paidAt === null || revenueTypeId === null) {
      continue;
    }
    forSummary.push({
      paidAt: payment.paidAt,
      localAmount: payment.localAmount,
      currency: payment.currency,
      channel: payment.channel,
      revenueTypeId,
    });
  }
  const reversed: ReversalForSummary[] = [];
  for (const reversal of reversals) {
    const revenueTypeId = reversal.payment.assessment?.revenueTypeId ?? water?.id ?? null;
    if (reversal.decidedAt === null || revenueTypeId === null) {
      continue;
    }
    reversed.push({
      decidedAt: reversal.decidedAt,
      localAmount: reversal.payment.localAmount,
      channel: reversal.payment.channel,
      revenueTypeId,
    });
  }
  const collectionRows = aggregateCollections(forSummary, reversed);
  const billingRows = aggregateBilling(
    bills,
    payments
      .filter((p) => p.billId !== null && p.paidAt !== null)
      .map((p) => ({ paidAt: p.paidAt ?? new Date(), localAmount: p.localAmount })),
  );

  await prisma.dailyCollectionSummary.deleteMany({ where: { date: { gte: start, lt: end } } });
  if (collectionRows.length > 0) {
    await prisma.dailyCollectionSummary.createMany({
      data: collectionRows.map((row) => ({ ...row, date: new Date(row.date) })),
    });
  }
  await prisma.dailyBillingSummary.deleteMany({ where: { date: { gte: start, lt: end } } });
  if (billingRows.length > 0) {
    await prisma.dailyBillingSummary.createMany({
      data: billingRows.map((row) => ({ ...row, date: new Date(row.date) })),
    });
  }
  return collectionRows.length;
}
