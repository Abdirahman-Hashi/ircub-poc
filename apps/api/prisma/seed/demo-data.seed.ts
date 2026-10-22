import { faker } from '@faker-js/faker';
import { min as earliest, subDays, subMonths } from 'date-fns';
import { Decimal } from 'decimal.js';

import {
  AssessmentStatus,
  Currency,
  PayerType,
  PaymentChannel,
  PaymentStatus,
  RateType,
  ReversalStatus,
} from '@ircub/shared';

import { formatControlNumber, formatTin, generateTinBody } from '../../src/common/ids/ids.rules';
import { convertToLocal, roundMoney } from '../../src/common/money/money.rules';
import {
  applyPayment,
  computeAssessmentAmount,
  reversePayment,
} from '../../src/modules/assessments/assessments.rules';
import { normalisePhone } from '../../src/modules/payers/payers.rules';

import { DEMO, SEED_FX_RATE } from './seed.constants';
import { requireValue } from './seed.utils';

import type { ExtendedPrismaClient } from '../../src/prisma/prisma.types';
import type { Prisma } from '@prisma/client';

/**
 * Registry, assessments, payments and reversals for the demo (D24). Skipped entirely when
 * payers already exist so repeated seeds stay fast and never duplicate demo rows; the
 * reference data seeders above it remain idempotent.
 */
export async function seedDemoData(prisma: ExtendedPrismaClient): Promise<string> {
  if ((await prisma.payer.count()) > 0) {
    return 'present, skipped';
  }
  const [users, revenueTypes] = await Promise.all([
    prisma.user.findMany(),
    prisma.revenueType.findMany(),
  ]);
  const userId = (email: string): string =>
    requireValue(new Map(users.map((u) => [u.email, u.id])), email, 'user');
  const officerId = userId(DEMO.OFFICER_EMAIL);
  const supervisorId = userId(DEMO.SUPERVISOR_EMAIL);
  const typeByCode = new Map(revenueTypes.map((t) => [t.code, t]));
  const assessableTypes = revenueTypes.filter((t) => t.code !== DEMO.WATER_TYPE_CODE);

  // ── Payers (with 5 deliberate duplicates by phone or email) ──────────────────
  const payerRows: Prisma.PayerCreateManyInput[] = [];
  for (let i = 0; i < DEMO.PAYERS; i += 1) {
    const isBusiness = faker.datatype.boolean({ probability: DEMO.BUSINESS_RATIO });
    const phone =
      normalisePhone(`+2526${faker.string.numeric(8)}`, DEMO.COUNTRY_CODE) ??
      `+2526${faker.string.numeric(8)}`;
    const email = faker.internet.email().toLowerCase();
    payerRows.push({
      tin: formatTin(generateTinBody(() => faker.number.int({ min: 0, max: 9 }))),
      type: isBusiness ? PayerType.BUSINESS : PayerType.INDIVIDUAL,
      name: isBusiness ? faker.company.name() : faker.person.fullName(),
      nationalId: isBusiness ? null : faker.string.alphanumeric({ length: 10, casing: 'upper' }),
      registrationNo: isBusiness ? `REG-${faker.string.numeric(6)}` : null,
      phone,
      email,
      address: `${faker.location.streetAddress()}, ${faker.location.city()}`,
      createdById: officerId,
      createdAt: subDays(new Date(), faker.number.int({ min: 0, max: DEMO.HISTORY_DAYS })),
    });
  }
  // Duplicates: copy phone from one earlier payer, email from another.
  for (let d = 0; d < DEMO.DUPLICATES; d += 1) {
    const source = payerRows[d * 7];
    const target = payerRows[payerRows.length - 1 - d];
    if (source === undefined || target === undefined) {
      break;
    }
    if (d % 2 === 0) {
      target.phone = source.phone;
    } else {
      target.email = source.email ?? null;
    }
  }
  await prisma.payer.createMany({ data: payerRows });
  const payers = await prisma.payer.findMany({ select: { id: true, phone: true, email: true } });
  // Flag the seeded duplicates the way registration would.
  for (let d = 0; d < DEMO.DUPLICATES; d += 1) {
    const source = payerRows[d * 7];
    const target = payerRows[payerRows.length - 1 - d];
    if (source === undefined || target === undefined) {
      break;
    }
    const a = payers.find((p) => p.phone === source.phone && p.email === source.email);
    const b = payers.find((p) => p.phone === target.phone && p.email === target.email);
    if (a !== undefined && b !== undefined && a.id !== b.id) {
      await prisma.duplicateFlag.create({
        data: { payerId: b.id, matchedPayerId: a.id, matchField: d % 2 === 0 ? 'PHONE' : 'EMAIL' },
      });
    }
  }

  // Link the demo customer to the first payer.
  const firstPayer = payers[0];
  if (firstPayer !== undefined) {
    await prisma.user.update({
      where: { email: DEMO.CUSTOMER_EMAIL },
      data: { payerId: firstPayer.id },
    });
  }

  // ── Assessments over the last 12 months ──────────────────────────────────────
  await prisma.controlNumber.createMany({
    data: Array.from({ length: DEMO.ASSESSMENTS }, () => ({ purpose: 'ASSESSMENT' as const })),
  });
  const sequences = await prisma.controlNumber.findMany({
    orderBy: { id: 'asc' },
    take: DEMO.ASSESSMENTS,
    select: { id: true },
  });
  const licence = requireValue(typeByCode, 'BUSINESS_LICENCE', 'revenue type');
  const assessmentRows: Prisma.AssessmentCreateManyInput[] = [];
  for (let i = 0; i < DEMO.ASSESSMENTS; i += 1) {
    const sequence = sequences[i];
    if (sequence === undefined) {
      break;
    }
    // The first RESERVED assessments are plain licence fees left unpaid: the sample CSV targets them.
    const reserved = i < DEMO.RESERVED_UNPAID;
    const type = reserved
      ? licence
      : (assessableTypes[faker.number.int({ min: 0, max: assessableTypes.length - 1 })] ?? licence);
    const baseAmount =
      type.rateType === RateType.PERCENT
        ? roundMoney(faker.number.int({ min: 2_000_000, max: 80_000_000 }))
        : null;
    const amount =
      computeAssessmentAmount(type.rateType, type.rate, baseAmount) ?? roundMoney(type.rate);
    const createdAt = reserved
      ? subDays(new Date(), 10)
      : subDays(new Date(), faker.number.int({ min: 0, max: DEMO.HISTORY_DAYS }));
    const payer = payers[faker.number.int({ min: 0, max: payers.length - 1 })];
    assessmentRows.push({
      controlNumber: formatControlNumber(sequence.id),
      payerId: (reserved ? firstPayer : payer)?.id ?? '',
      revenueTypeId: type.id,
      period:
        type.code === 'MARKET_FEE'
          ? subMonths(createdAt, 0).toISOString().slice(0, 7)
          : String(createdAt.getUTCFullYear()),
      baseAmount: baseAmount?.toFixed() ?? null,
      amount: amount.toFixed(),
      currency: Currency.SOS,
      dueDate: subDays(createdAt, -DEMO.DUE_DAYS),
      createdById: officerId,
      createdAt,
    });
  }
  await prisma.assessment.createMany({ data: assessmentRows });
  const assessments = await prisma.assessment.findMany({
    where: { controlNumber: { in: assessmentRows.map((a) => a.controlNumber) } },
  });
  const reservedNumbers = new Set(
    assessmentRows.slice(0, DEMO.RESERVED_UNPAID).map((a) => a.controlNumber),
  );

  // ── Payments against ~60 % of the non-reserved assessments ───────────────────
  const paymentRows: Prisma.PaymentCreateManyInput[] = [];
  const ledgerUpdates: { id: string; paidAmount: string; status: AssessmentStatus }[] = [];
  const channels = [
    PaymentChannel.CASH,
    PaymentChannel.BANK,
    PaymentChannel.MOBILE_MONEY,
    PaymentChannel.BULK,
  ];
  let paymentCount = 0;
  for (const assessment of assessments) {
    if (reservedNumbers.has(assessment.controlNumber) || paymentCount >= DEMO.PAYMENTS) {
      continue;
    }
    if (!faker.datatype.boolean({ probability: DEMO.PAID_RATIO })) {
      continue;
    }
    const full = faker.datatype.boolean({ probability: DEMO.FULL_PAYMENT_RATIO });
    const localAmount = full
      ? new Decimal(assessment.amount.toString())
      : roundMoney(
          new Decimal(assessment.amount.toString()).mul(faker.number.float({ min: 0.2, max: 0.8 })),
        );
    const isUsd = faker.datatype.boolean({ probability: DEMO.USD_RATIO });
    const channel =
      channels[faker.number.int({ min: 0, max: channels.length - 1 })] ?? PaymentChannel.CASH;
    // Paid some days after assessment, but never in the future (lists sort by date desc).
    const paidAt = earliest([
      subDays(assessment.createdAt, -faker.number.int({ min: 1, max: DEMO.DUE_DAYS })),
      new Date(),
    ]);
    const amount = isUsd ? roundMoney(localAmount.div(SEED_FX_RATE)) : localAmount;
    const effectiveLocal = isUsd ? convertToLocal(amount, SEED_FX_RATE).localAmount : localAmount;
    const applied = applyPayment(
      {
        amount: new Decimal(assessment.amount.toString()),
        paidAmount: new Decimal(0),
        status: assessment.status,
      },
      effectiveLocal,
    );
    if (!applied.ok) {
      continue;
    }
    paymentRows.push({
      controlNumber: assessment.controlNumber,
      assessmentId: assessment.id,
      payerId: assessment.payerId,
      channel,
      channelTxnRef:
        channel === PaymentChannel.CASH
          ? null
          : `${channel === PaymentChannel.BANK ? 'BNK' : channel === PaymentChannel.MOBILE_MONEY ? 'MM' : 'BLK'}-${faker.string.alphanumeric({ length: 10, casing: 'upper' })}`,
      amount: amount.toFixed(),
      currency: isUsd ? Currency.USD : Currency.SOS,
      fxRate: isUsd ? SEED_FX_RATE : '1',
      fxRateAt: isUsd ? paidAt : null,
      localAmount: effectiveLocal.toFixed(),
      status: PaymentStatus.CONFIRMED,
      paidAt,
      capturedById: officerId,
      createdAt: paidAt,
    });
    ledgerUpdates.push({
      id: assessment.id,
      paidAmount: applied.paidAmount.toFixed(),
      status: applied.status,
    });
    paymentCount += 1;
  }
  await prisma.payment.createMany({ data: paymentRows });
  for (const update of ledgerUpdates) {
    await prisma.assessment.update({
      where: { id: update.id },
      data: { paidAmount: update.paidAmount, status: update.status },
    });
  }

  // ── Reversals in mixed states ────────────────────────────────────────────────
  const confirmed = await prisma.payment.findMany({
    where: { status: PaymentStatus.CONFIRMED },
    take: DEMO.REVERSALS,
    orderBy: { createdAt: 'desc' },
  });
  for (const [index, payment] of confirmed.entries()) {
    const status =
      index < DEMO.REVERSALS_APPROVED
        ? ReversalStatus.APPROVED
        : index < DEMO.REVERSALS_APPROVED + DEMO.REVERSALS_REJECTED
          ? ReversalStatus.REJECTED
          : ReversalStatus.PENDING_APPROVAL;
    const decided = status !== ReversalStatus.PENDING_APPROVAL;
    await prisma.reversal.create({
      data: {
        paymentId: payment.id,
        reason: faker.helpers.arrayElement(DEMO.REVERSAL_REASONS),
        capturedById: officerId,
        status,
        approvedById: decided ? supervisorId : null,
        decidedAt: decided ? new Date() : null,
        decisionNote: decided ? 'Reviewed' : null,
      },
    });
    if (status === ReversalStatus.APPROVED && payment.assessmentId !== null) {
      const assessment = await prisma.assessment.findUniqueOrThrow({
        where: { id: payment.assessmentId },
      });
      const next = reversePayment(
        {
          amount: new Decimal(assessment.amount.toString()),
          paidAmount: new Decimal(assessment.paidAmount.toString()),
          status: assessment.status,
        },
        new Decimal(payment.localAmount.toString()),
      );
      await prisma.assessment.update({
        where: { id: assessment.id },
        data: { paidAmount: next.paidAmount.toFixed(), status: next.status },
      });
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.REVERSED },
      });
    }
  }

  return `${payerRows.length} payers, ${assessmentRows.length} assessments, ${paymentRows.length} payments, ${confirmed.length} reversals`;
}
