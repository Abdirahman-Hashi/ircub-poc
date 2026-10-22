import { subDays } from 'date-fns';

import {
  FMIS,
  JournalBatchKind,
  JournalBatchStatus,
  PaymentStatus,
  REVENUE_TYPE_CODES,
  ReversalStatus,
} from '@ircub/shared';
import type { FmisJournalResponse } from '@ircub/shared';

import {
  collectionLine,
  reversalLine,
  sumAmounts,
  toDateKey,
  toFmisPayload,
} from '../../src/modules/fmis/fmis.rules';
import {
  SystemConfigKey,
  SYSTEM_CONFIG_DEFAULTS,
} from '../../src/modules/system-config/system-config.keys';

import { FMIS_DEMO } from './seed.constants';

import type { FmisPostOutcome, FmisSeedContext, FmisSeedTotals } from './seed.types';
import type { LineDraft } from '../../src/modules/fmis/fmis.types';
import type { ExtendedPrismaClient } from '../../src/prisma/prisma.types';

/** GL mappings for every revenue type, copied from the type's default `glCode`, effective from the epoch. */
export async function seedGlMappings(prisma: ExtendedPrismaClient): Promise<string> {
  const types = await prisma.revenueType.findMany();
  for (const type of types) {
    await prisma.glMapping.upsert({
      where: {
        revenueTypeId_effectiveFrom: {
          revenueTypeId: type.id,
          effectiveFrom: FMIS_DEMO.MAPPING_EFFECTIVE_FROM,
        },
      },
      update: {},
      create: {
        revenueTypeId: type.id,
        glCode: type.glCode,
        glName: `${type.name} revenue`,
        effectiveFrom: FMIS_DEMO.MAPPING_EFFECTIVE_FROM,
      },
    });
  }
  return `${types.length} mappings`;
}

/**
 * ~31 days of journal batches built from confirmed payments and posted to the mock FMIS when
 * it is reachable (D17). The mock's "date ends in 13" trigger leaves that day FAILED, yesterday
 * is left PENDING (posted automatically when the API boots) and the day before FAILED for the
 * retry demo. Days of approved reversals outside the window are back-filled so at least one
 * REVERSAL batch exists. Skipped when batches already exist.
 */
export async function seedJournalBatches(
  prisma: ExtendedPrismaClient,
  mocksBaseUrl: string | undefined,
): Promise<string> {
  if ((await prisma.journalBatch.count()) > 0) {
    return 'present, skipped';
  }
  const types = await prisma.revenueType.findMany({
    select: { id: true, code: true, glCode: true },
  });
  const context = {
    prisma,
    mocksBaseUrl,
    cashGl: SYSTEM_CONFIG_DEFAULTS[SystemConfigKey.CASH_GL_CODE],
    retryLimit: SYSTEM_CONFIG_DEFAULTS[SystemConfigKey.FMIS_POST_RETRY_LIMIT],
    glByType: new Map(types.map((t) => [t.id, t.glCode])),
    waterTypeId: types.find((t) => t.code === REVENUE_TYPE_CODES.WATER)?.id ?? null,
    now: new Date(),
  };
  const totals: FmisSeedTotals = {
    posted: 0,
    failed: 0,
    pending: 0,
    reversals: 0,
    reachable: mocksBaseUrl !== undefined,
  };

  const days = new Set<string>();
  for (let back: number = FMIS_DEMO.HISTORY_DAYS; back >= 1; back -= 1) {
    days.add(toDateKey(subDays(context.now, back)));
  }
  // Days of approved reversals (seeded in phase 2, possibly older than the window).
  const approved = await prisma.reversal.findMany({
    where: { status: ReversalStatus.APPROVED },
    select: { payment: { select: { paidAt: true } } },
  });
  for (const reversal of approved) {
    if (reversal.payment.paidAt !== null && reversal.payment.paidAt < context.now) {
      days.add(toDateKey(reversal.payment.paidAt));
    }
  }
  const today = toDateKey(context.now);
  for (const day of [...days].sort()) {
    if (day >= today) {
      continue;
    }
    const demoState =
      day === toDateKey(subDays(context.now, 1))
        ? JournalBatchStatus.PENDING
        : day === toDateKey(subDays(context.now, 2))
          ? JournalBatchStatus.FAILED
          : null;
    await buildDay(context, totals, day, demoState);
  }
  return `${totals.posted} posted, ${totals.failed} failed, ${totals.pending} pending, ${totals.reversals} reversal batches${totals.reachable ? '' : ' (mock FMIS unreachable: unposted batches left PENDING)'}`;
}

async function buildDay(
  context: FmisSeedContext,
  totals: FmisSeedTotals,
  day: string,
  demoState: JournalBatchStatus | null,
): Promise<void> {
  const { prisma } = context;
  const dayStart = new Date(day);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  const payments = await prisma.payment.findMany({
    where: {
      paidAt: { gte: dayStart, lt: dayEnd },
      journalLine: null,
      OR: [
        { status: PaymentStatus.CONFIRMED },
        {
          status: PaymentStatus.REVERSED,
          reversals: { some: { status: ReversalStatus.APPROVED } },
        },
      ],
    },
    select: {
      id: true,
      controlNumber: true,
      localAmount: true,
      currency: true,
      status: true,
      assessment: { select: { revenueTypeId: true } },
      reversals: {
        where: { status: ReversalStatus.APPROVED },
        select: { id: true, decidedAt: true },
        take: 1,
      },
    },
  });
  const drafts: LineDraft[] = [];
  for (const payment of payments) {
    const revenueTypeId = payment.assessment?.revenueTypeId ?? context.waterTypeId;
    const glCode = revenueTypeId === null ? null : (context.glByType.get(revenueTypeId) ?? null);
    if (revenueTypeId === null || glCode === null) {
      continue;
    }
    drafts.push(collectionLine({ ...payment, revenueTypeId }, glCode, context.cashGl));
  }
  if (drafts.length === 0) {
    return;
  }
  const batch = await prisma.journalBatch.create({
    data: {
      batchDate: dayStart,
      kind: JournalBatchKind.COLLECTIONS,
      lineCount: drafts.length,
      totalLocal: sumAmounts(drafts),
      ...(demoState === JournalBatchStatus.FAILED
        ? { status: demoState, attempts: context.retryLimit, lastError: FMIS_DEMO.FAILED_ERROR }
        : {}),
    },
  });
  await prisma.journalLine.createMany({
    data: drafts.map((draft) => ({ ...draft, batchId: batch.id })),
  });
  if (demoState === JournalBatchStatus.FAILED) {
    totals.failed += 1;
    return;
  }
  if (demoState === JournalBatchStatus.PENDING || !totals.reachable) {
    totals.pending += 1;
    return;
  }
  const outcome = await postToMocks(context.mocksBaseUrl ?? '', batch.id, day, drafts);
  if (outcome.kind === 'unreachable') {
    totals.reachable = false;
    totals.pending += 1;
    return;
  }
  if (outcome.kind === 'rejected') {
    await prisma.journalBatch.update({
      where: { id: batch.id },
      data: {
        status: JournalBatchStatus.FAILED,
        attempts: context.retryLimit,
        lastError: outcome.error,
      },
    });
    totals.failed += 1;
    return;
  }
  await prisma.journalBatch.update({
    where: { id: batch.id },
    data: {
      status: JournalBatchStatus.POSTED,
      fmisReference: outcome.reference,
      postedAt: dayEnd,
      attempts: 1,
    },
  });
  totals.posted += 1;

  // Approved reversals of posted payments get their mirrored REVERSAL batch.
  for (const payment of payments) {
    const approved = payment.reversals[0];
    const original = drafts.find((draft) => draft.paymentId === payment.id);
    if (
      payment.status !== PaymentStatus.REVERSED ||
      approved === undefined ||
      original === undefined
    ) {
      continue;
    }
    const mirror = reversalLine(original, approved.id);
    const reversalDay = toDateKey(approved.decidedAt ?? context.now);
    const reversalBatch = await prisma.journalBatch.create({
      data: {
        batchDate: new Date(reversalDay),
        kind: JournalBatchKind.REVERSAL,
        lineCount: 1,
        totalLocal: mirror.amount,
      },
    });
    await prisma.journalLine.create({ data: { ...mirror, batchId: reversalBatch.id } });
    await prisma.journalLine.update({ where: { paymentId: payment.id }, data: { reversed: true } });
    const mirrorOutcome = await postToMocks(
      context.mocksBaseUrl ?? '',
      reversalBatch.id,
      reversalDay,
      [mirror],
    );
    if (mirrorOutcome.kind === 'posted') {
      await prisma.journalBatch.update({
        where: { id: reversalBatch.id },
        data: {
          status: JournalBatchStatus.POSTED,
          fmisReference: mirrorOutcome.reference,
          postedAt: approved.decidedAt ?? context.now,
          attempts: 1,
        },
      });
    }
    totals.reversals += 1;
  }
}

async function postToMocks(
  baseUrl: string,
  batchId: string,
  date: string,
  lines: readonly LineDraft[],
): Promise<FmisPostOutcome> {
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}${FMIS.JOURNALS_PATH}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ batchId, date, lines: toFmisPayload(lines) }),
      signal: AbortSignal.timeout(FMIS_DEMO.MOCKS_TIMEOUT_MS),
    });
    if (!response.ok) {
      return {
        kind: 'rejected',
        error: `FMIS responded ${response.status}: ${await response.text()}`,
      };
    }
    return {
      kind: 'posted',
      reference: ((await response.json()) as FmisJournalResponse).fmisReference,
    };
  } catch {
    return { kind: 'unreachable' };
  }
}
