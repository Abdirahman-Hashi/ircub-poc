import { subMonths } from 'date-fns';
import { Decimal } from 'decimal.js';

import { REVENUE_TYPE_CODES } from '@ircub/shared';

import { periodsBetween, toPeriodKey } from '../../src/modules/dashboard/dashboard.rules';
import { rebuildDailySummaries } from '../../src/modules/dashboard/summary.rebuild';
import { toDateKey } from '../../src/modules/fmis/fmis.rules';

import { DASHBOARD_DEMO } from './seed.constants';

import type { ExtendedPrismaClient } from '../../src/prisma/prisma.types';

/** Full rebuild of the daily summaries for the last 12 months (D18); idempotent by nature. */
export async function seedSummaries(prisma: ExtendedPrismaClient): Promise<string> {
  const now = new Date();
  const from = toDateKey(subMonths(now, DASHBOARD_DEMO.HISTORY_MONTHS));
  const rows = await rebuildDailySummaries(prisma, from, toDateKey(now));
  return `${rows} daily rows from ${from}`;
}

/**
 * Monthly targets per tax revenue type for the last 12 months and the next 3: each type's
 * average monthly collection (from the summaries) raised by a demo margin, so attainment
 * hovers around 90 %. Skipped when targets exist.
 */
export async function seedRevenueTargets(prisma: ExtendedPrismaClient): Promise<string> {
  if ((await prisma.revenueTarget.count()) > 0) {
    return 'present, skipped';
  }
  const now = new Date();
  const types = await prisma.revenueType.findMany({
    where: { code: { not: REVENUE_TYPE_CODES.WATER } },
    select: { id: true },
  });
  const history = periodsBetween(
    toPeriodKey(subMonths(now, DASHBOARD_DEMO.HISTORY_MONTHS)),
    toPeriodKey(now),
  );
  const periods = periodsBetween(
    history[0] ?? toPeriodKey(now),
    toPeriodKey(subMonths(now, -DASHBOARD_DEMO.FUTURE_MONTHS)),
  );
  let created = 0;
  for (const type of types) {
    const totals = await prisma.dailyCollectionSummary.aggregate({
      where: { revenueTypeId: type.id },
      _sum: { total: true },
    });
    const monthlyAverage = new Decimal((totals._sum.total ?? 0).toString()).div(history.length);
    const target = monthlyAverage.mul(DASHBOARD_DEMO.TARGET_MARGIN).toDecimalPlaces(0);
    for (const period of periods) {
      await prisma.revenueTarget.create({
        data: { period, revenueTypeId: type.id, amount: target.toFixed() },
      });
      created += 1;
    }
  }
  return `${created} targets`;
}
