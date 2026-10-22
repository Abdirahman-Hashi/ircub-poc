import { faker } from '@faker-js/faker';
import { subDays } from 'date-fns';
import { Decimal } from 'decimal.js';

import { AssessmentStatus, CHANNEL, Currency, PaymentChannel, PaymentStatus } from '@ircub/shared';
import type { SeedStatementLine, SeedStatementRequest } from '@ircub/shared';

import { convertToLocal, roundMoney } from '../../src/common/money/money.rules';
import { applyPayment } from '../../src/modules/assessments/assessments.rules';
import { PAYMENTS_MESSAGES } from '../../src/modules/payments/payments.messages';
import {
  SystemConfigKey,
  SYSTEM_CONFIG_DEFAULTS,
} from '../../src/modules/system-config/system-config.keys';

import { CHANNEL_DEMO, DEMO, SEED_FX_RATE } from './seed.constants';
import { requireValue } from './seed.utils';

import type { ExtendedPrismaClient } from '../../src/prisma/prisma.types';
import type { Prisma } from '@prisma/client';

const ONLINE = [PaymentChannel.BANK, PaymentChannel.MOBILE_MONEY] as const;

function txnRef(channel: PaymentChannel): string {
  const prefix =
    channel === PaymentChannel.BANK ? CHANNEL.BANK_REF_PREFIX : CHANNEL.MOMO_REF_PREFIX;
  return `${prefix}${faker.string.alphanumeric({ length: CHANNEL_DEMO.REF_LENGTH, casing: 'upper' })}`;
}

function pickChannel(): PaymentChannel {
  return ONLINE[faker.number.int({ min: 0, max: ONLINE.length - 1 })] ?? PaymentChannel.BANK;
}

/**
 * ~300 confirmed bank / mobile-money payments over the last 60 days, plus a few failed and
 * permanently failed ones, so the payments list, FX columns and reconciliation have data.
 * Skipped when a permanently failed payment already exists (marker of a previous run); the
 * mock registration below runs every time because the mocks keep state in memory only.
 */
export async function seedChannelPayments(
  prisma: ExtendedPrismaClient,
  mocksBaseUrl: string | undefined,
): Promise<string> {
  const created =
    (await prisma.payment.count({ where: { status: PaymentStatus.PERMANENTLY_FAILED } })) > 0
      ? 'present, skipped'
      : await createPayments(prisma);
  const registered = await registerWithMocks(prisma, mocksBaseUrl);
  return `${created}; ${registered}`;
}

async function createPayments(prisma: ExtendedPrismaClient): Promise<string> {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  const officerId = requireValue(
    new Map(users.map((u) => [u.email, u.id])),
    DEMO.OFFICER_EMAIL,
    'user',
  );
  const candidates = await prisma.assessment.findMany({
    where: { status: { in: [AssessmentStatus.PENDING, AssessmentStatus.PART_PAID] } },
    // Control numbers are sequential; the lowest ones are reserved for the sample CSV / e2e.
    orderBy: { controlNumber: 'asc' },
    skip: CHANNEL_DEMO.SKIP_OLDEST,
  });
  const now = new Date();
  const rows: Prisma.PaymentCreateManyInput[] = [];
  const ledger: { id: string; paidAmount: string; status: AssessmentStatus }[] = [];

  for (const assessment of candidates) {
    if (rows.length >= CHANNEL_DEMO.PAYMENTS) {
      break;
    }
    const outstanding = new Decimal(assessment.amount.toString()).minus(
      assessment.paidAmount.toString(),
    );
    const share = faker.number.float({ min: CHANNEL_DEMO.MIN_SHARE, max: CHANNEL_DEMO.MAX_SHARE });
    const localAmount = roundMoney(outstanding.mul(share));
    if (!localAmount.gt(0)) {
      continue;
    }
    const isUsd = faker.datatype.boolean({ probability: CHANNEL_DEMO.USD_RATIO });
    const amount = isUsd ? roundMoney(localAmount.div(SEED_FX_RATE)) : localAmount;
    const effectiveLocal = isUsd ? convertToLocal(amount, SEED_FX_RATE).localAmount : localAmount;
    const applied = applyPayment(
      {
        amount: new Decimal(assessment.amount.toString()),
        paidAmount: new Decimal(assessment.paidAmount.toString()),
        status: assessment.status,
      },
      effectiveLocal,
    );
    if (!applied.ok || !amount.gt(0)) {
      continue;
    }
    const channel = pickChannel();
    const paidAt = subDays(now, faker.number.int({ min: 0, max: CHANNEL_DEMO.HISTORY_DAYS - 1 }));
    const ref = txnRef(channel);
    rows.push({
      controlNumber: assessment.controlNumber,
      assessmentId: assessment.id,
      payerId: assessment.payerId,
      channel,
      channelTxnRef: ref,
      amount: amount.toFixed(),
      currency: isUsd ? Currency.USD : Currency.SOS,
      fxRate: isUsd ? SEED_FX_RATE : '1',
      fxRateAt: isUsd ? paidAt : null,
      localAmount: effectiveLocal.toFixed(),
      status: PaymentStatus.CONFIRMED,
      paidAt,
      capturedById: officerId,
      channelRequestPayload: {
        amount: amount.toFixed(),
        currency: isUsd ? Currency.USD : Currency.SOS,
        controlNumber: assessment.controlNumber,
        callbackUrl: `seed://payments/callback/${channel}`,
      },
      callbackPayload: {
        txnRef: ref,
        status: 'SUCCESS',
        amount: amount.toFixed(),
        currency: isUsd ? Currency.USD : Currency.SOS,
        controlNumber: assessment.controlNumber,
        paidAt: paidAt.toISOString(),
      },
      createdAt: paidAt,
    });
    ledger.push({
      id: assessment.id,
      paidAmount: applied.paidAmount.toFixed(),
      status: applied.status,
    });
  }

  // Failure demos: no ledger effect, amounts carry the mock scenario suffixes.
  const retryLimit = SYSTEM_CONFIG_DEFAULTS[SystemConfigKey.PAYMENT_STATUS_RETRY_LIMIT];
  const failureTargets = candidates.slice(-(CHANNEL_DEMO.PERMANENTLY_FAILED + CHANNEL_DEMO.FAILED));
  failureTargets.forEach((assessment, index) => {
    const permanent = index < CHANNEL_DEMO.PERMANENTLY_FAILED;
    const channel = pickChannel();
    const whole = faker.number.int({ min: 10, max: 500 });
    const amount = `${whole}${permanent ? CHANNEL_DEMO.NO_CALLBACK_STATUS_ERROR_SUFFIX : CHANNEL_DEMO.FAILED_SUFFIX}`;
    const at = subDays(now, faker.number.int({ min: 0, max: CHANNEL_DEMO.HISTORY_DAYS - 1 }));
    const ref = txnRef(channel);
    rows.push({
      controlNumber: assessment.controlNumber,
      assessmentId: assessment.id,
      payerId: assessment.payerId,
      channel,
      channelTxnRef: ref,
      amount,
      currency: Currency.SOS,
      fxRate: '1',
      localAmount: amount,
      status: permanent ? PaymentStatus.PERMANENTLY_FAILED : PaymentStatus.FAILED,
      failureReason: permanent
        ? PAYMENTS_MESSAGES.PERMANENTLY_FAILED
        : PAYMENTS_MESSAGES.CHANNEL_FAILED,
      statusCheckAttempts: permanent ? retryLimit : 0,
      lastStatusCheckAt: permanent ? at : null,
      permanentlyFailedAt: permanent ? at : null,
      capturedById: officerId,
      channelRequestPayload: {
        amount,
        currency: Currency.SOS,
        controlNumber: assessment.controlNumber,
        callbackUrl: `seed://payments/callback/${channel}`,
      },
      ...(permanent
        ? {}
        : {
            callbackPayload: {
              txnRef: ref,
              status: 'FAILED',
              amount,
              currency: Currency.SOS,
              controlNumber: assessment.controlNumber,
              paidAt: at.toISOString(),
            },
          }),
      createdAt: at,
    });
  });

  await prisma.payment.createMany({ data: rows });
  for (const update of ledger) {
    await prisma.assessment.update({
      where: { id: update.id },
      data: { paidAmount: update.paidAmount, status: update.status },
    });
  }
  return `${rows.length} channel payments`;
}

/** Tells the mock channels about every confirmed online payment of the window so statements list them. */
async function registerWithMocks(
  prisma: ExtendedPrismaClient,
  mocksBaseUrl: string | undefined,
): Promise<string> {
  if (mocksBaseUrl === undefined) {
    return 'mocks not configured';
  }
  const since = subDays(new Date(), CHANNEL_DEMO.HISTORY_DAYS);
  const payments = await prisma.payment.findMany({
    where: {
      channel: { in: [...ONLINE] },
      status: PaymentStatus.CONFIRMED,
      channelTxnRef: { not: null },
      paidAt: { gte: since },
    },
    select: {
      channel: true,
      channelTxnRef: true,
      amount: true,
      currency: true,
      controlNumber: true,
      paidAt: true,
    },
  });
  let registered = 0;
  for (const channel of ONLINE) {
    const lines: SeedStatementLine[] = payments
      .filter((p) => p.channel === channel && p.paidAt !== null && p.channelTxnRef !== null)
      .map((p) => ({
        txnRef: p.channelTxnRef ?? '',
        date: (p.paidAt ?? new Date()).toISOString().slice(0, 'YYYY-MM-DD'.length),
        amount: p.amount.toFixed(),
        currency: p.currency,
        controlNumber: p.controlNumber,
      }));
    const body: SeedStatementRequest = { channel, lines };
    try {
      const response = await fetch(
        `${mocksBaseUrl.replace(/\/$/, '')}${CHANNEL_DEMO.SEED_STATEMENT_PATH}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(CHANNEL_DEMO.MOCKS_TIMEOUT_MS),
        },
      );
      if (!response.ok) {
        throw new Error(`mocks responded ${response.status}`);
      }
      registered += lines.length;
    } catch (error: unknown) {
      return `mocks unreachable (${error instanceof Error ? error.message : String(error)}), statements not registered`;
    }
  }
  return `${registered} payments registered with mocks`;
}
