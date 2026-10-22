import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import {
  AssessmentStatus,
  BillStatus,
  DuplicateFlagStatus,
  ErrorCode,
  type Paginated,
  PayerStatus,
} from '@ircub/shared';

import { AppException } from '../../common/errors/app.exception';
import { IdsService } from '../../common/ids/ids.service';
import { roundMoney } from '../../common/money/money.rules';
import { parseSort, toPageSlice, toPaginated } from '../../common/pagination/pagination.rules';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ASSESSMENT_INCLUDE,
  outstandingOf,
  toAssessmentView,
} from '../assessments/assessments.view';
import { PAYMENT_INCLUDE, toPaymentView } from '../payments/payments.view';
import { SystemConfigKey } from '../system-config/system-config.keys';
import { SystemConfigService } from '../system-config/system-config.service';
import { ACCOUNT_INCLUDE, BILL_INCLUDE, toAccountView, toBillView } from '../water/water.view';

import { PAYERS_API } from './payers.constants';
import { PAYERS_MESSAGES } from './payers.messages';
import {
  findDuplicateCandidates,
  normaliseEmail,
  normaliseNationalId,
  normalisePhone,
} from './payers.rules';
import { toDuplicateFlagView, toPayerView } from './payers.view';

import type { CreatePayerDto } from './dto/create-payer.dto';
import type { DuplicateFilterDto } from './dto/duplicate-filter.dto';
import type { DuplicateFlagResponseDto } from './dto/duplicate-flag.response.dto';
import type { PayerFilterDto } from './dto/payer-filter.dto';
import type { PayerProfileResponseDto } from './dto/payer-profile.response.dto';
import type { PayerResponseDto } from './dto/payer.response.dto';
import type { RegisteredPayerResponseDto } from './dto/registered-payer.response.dto';
import type { ReviewDuplicateDto } from './dto/review-duplicate.dto';
import type { UpdatePayerDto } from './dto/update-payer.dto';
import type { PayerIdentity } from './payers.types';
import type { Payer, Prisma } from '@prisma/client';

const FLAG_INCLUDE = { payer: true, matchedPayer: true } as const;

/** Taxpayer & customer registry (brief Module 2) with server-generated TINs and duplicate flags. */
@Injectable()
export class PayersService {
  private readonly logger = new Logger(PayersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdsService,
    private readonly systemConfig: SystemConfigService,
  ) {}

  async create(dto: CreatePayerDto, actorId: string): Promise<RegisteredPayerResponseDto> {
    const identity = await this.normaliseIdentity(dto.phone, dto.email, dto.nationalId);
    const tin = await this.ids.generateTin();
    const payer = await this.prisma.payer.create({
      data: {
        tin,
        type: dto.type,
        name: dto.name.trim(),
        nationalId: identity.nationalId,
        registrationNo: dto.registrationNo?.trim() ?? null,
        phone: identity.phone,
        email: identity.email,
        address: dto.address?.trim() ?? null,
        createdById: actorId,
      },
    });
    const warnings = await this.flagDuplicates(payer, identity);
    this.logger.log({
      msg: 'payer registered',
      payerId: payer.id,
      tin,
      duplicateFlags: warnings.length,
    });
    return Object.assign(toPayerView(payer), { warnings });
  }

  async list(filter: PayerFilterDto): Promise<Paginated<PayerResponseDto>> {
    const where: Prisma.PayerWhereInput = {
      ...(filter.type === undefined ? {} : { type: filter.type }),
      ...(filter.status === undefined ? {} : { status: filter.status }),
      ...(filter.search === undefined
        ? {}
        : {
            OR: [
              { name: { contains: filter.search, mode: 'insensitive' } },
              { tin: { contains: filter.search.toUpperCase() } },
              { phone: { contains: filter.search.replace(/[\s-]/g, '') } },
            ],
          }),
    };
    const sort = parseSort(filter.sort, PAYERS_API.SORTABLE, {
      field: 'createdAt',
      direction: 'desc',
    });
    const { skip, take } = toPageSlice(filter.page, filter.pageSize);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.payer.findMany({ where, skip, take, orderBy: { [sort.field]: sort.direction } }),
      this.prisma.payer.count({ where }),
    ]);
    return toPaginated(rows.map(toPayerView), total, filter.page, filter.pageSize);
  }

  /** 360° view: profile, assessments, recent payments and balances (brief Module 2). */
  async profile(id: string): Promise<PayerProfileResponseDto> {
    const payer = await this.findOrThrow(id);
    const [assessments, payments] = await Promise.all([
      this.prisma.assessment.findMany({
        where: { payerId: id },
        include: ASSESSMENT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        take: PAYERS_API.PROFILE_ASSESSMENTS,
      }),
      this.prisma.payment.findMany({
        where: { payerId: id },
        include: PAYMENT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        take: PAYERS_API.PROFILE_PAYMENTS,
      }),
    ]);
    const [totals, billTotals, accounts] = await Promise.all([
      this.prisma.assessment.aggregate({
        where: { payerId: id, status: { not: AssessmentStatus.CANCELLED } },
        _sum: { amount: true, paidAmount: true },
      }),
      this.prisma.bill.aggregate({
        where: {
          payerId: id,
          status: { in: [BillStatus.RELEASED, BillStatus.PART_PAID, BillStatus.PAID] },
        },
        _sum: { consumptionCharge: true, fixedCharge: true, paidAmount: true },
      }),
      this.prisma.waterAccount.findMany({
        where: { payerId: id },
        include: ACCOUNT_INCLUDE,
        orderBy: { openedAt: 'asc' },
      }),
    ]);
    const waterAccounts = await Promise.all(
      accounts.map(async (account) => ({
        account: toAccountView(account),
        bills: (
          await this.prisma.bill.findMany({
            where: { accountId: account.id },
            include: BILL_INCLUDE,
            orderBy: { periodStart: 'desc' },
            take: PAYERS_API.PROFILE_BILLS,
          })
        ).map(toBillView),
      })),
    );
    // Bills carry arrears forward inside `totalDue`, so the billed total is the sum of each
    // bill's own charges; summing `totalDue` would count the same arrears once per cycle.
    const assessedTotal = roundMoney(totals._sum.amount ?? 0)
      .plus(roundMoney(billTotals._sum.consumptionCharge ?? 0))
      .plus(roundMoney(billTotals._sum.fixedCharge ?? 0));
    const paidTotal = roundMoney(totals._sum.paidAmount ?? 0).plus(
      roundMoney(billTotals._sum.paidAmount ?? 0),
    );
    return {
      payer: toPayerView(payer),
      assessments: assessments.map(toAssessmentView),
      waterAccounts,
      payments: payments.map(toPaymentView),
      balances: {
        assessedTotal: assessedTotal.toFixed(),
        paidTotal: paidTotal.toFixed(),
        outstanding: outstandingOf(assessedTotal, paidTotal).toFixed(),
      },
    };
  }

  async update(id: string, dto: UpdatePayerDto): Promise<RegisteredPayerResponseDto> {
    const current = await this.findOrThrow(id);
    const identity = await this.normaliseIdentity(
      dto.phone ?? current.phone,
      dto.email ?? current.email,
      dto.nationalId ?? current.nationalId,
    );
    const payer = await this.prisma.payer.update({
      where: { id },
      data: {
        ...(dto.type === undefined ? {} : { type: dto.type }),
        ...(dto.name === undefined ? {} : { name: dto.name.trim() }),
        ...(dto.registrationNo === undefined ? {} : { registrationNo: dto.registrationNo.trim() }),
        ...(dto.address === undefined ? {} : { address: dto.address.trim() }),
        phone: identity.phone,
        email: identity.email,
        nationalId: identity.nationalId,
      },
    });
    const warnings = await this.flagDuplicates(payer, identity);
    return Object.assign(toPayerView(payer), { warnings });
  }

  async setStatus(id: string, status: PayerStatus): Promise<PayerResponseDto> {
    await this.findOrThrow(id);
    const payer = await this.prisma.payer.update({ where: { id }, data: { status } });
    this.logger.log({ msg: 'payer status changed', payerId: id, status });
    return toPayerView(payer);
  }

  async listDuplicates(filter: DuplicateFilterDto): Promise<Paginated<DuplicateFlagResponseDto>> {
    const where: Prisma.DuplicateFlagWhereInput = {
      status: filter.status ?? DuplicateFlagStatus.PENDING,
    };
    const { skip, take } = toPageSlice(filter.page, filter.pageSize);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.duplicateFlag.findMany({
        where,
        skip,
        take,
        include: FLAG_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.duplicateFlag.count({ where }),
    ]);
    return toPaginated(rows.map(toDuplicateFlagView), total, filter.page, filter.pageSize);
  }

  async reviewDuplicate(
    id: string,
    dto: ReviewDuplicateDto,
    actorId: string,
  ): Promise<DuplicateFlagResponseDto> {
    const flag = await this.prisma.duplicateFlag.findUnique({ where: { id } });
    if (flag === null) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        PAYERS_MESSAGES.FLAG_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        { id },
      );
    }
    if (flag.status !== DuplicateFlagStatus.PENDING) {
      throw new AppException(
        ErrorCode.CONFLICT,
        PAYERS_MESSAGES.FLAG_ALREADY_REVIEWED,
        HttpStatus.CONFLICT,
      );
    }
    const updated = await this.prisma.duplicateFlag.update({
      where: { id },
      data: {
        status: dto.status,
        note: dto.note ?? null,
        reviewedById: actorId,
        reviewedAt: new Date(),
      },
      include: FLAG_INCLUDE,
    });
    return toDuplicateFlagView(updated);
  }

  /** Guard used by assessment creation and payment capture. */
  async assertActive(id: string): Promise<Payer> {
    const payer = await this.findOrThrow(id);
    if (payer.status !== PayerStatus.ACTIVE) {
      throw new AppException(
        ErrorCode.PAYER_SUSPENDED,
        PAYERS_MESSAGES.SUSPENDED,
        HttpStatus.CONFLICT,
        { payerId: id },
      );
    }
    return payer;
  }

  private async normaliseIdentity(
    phone: string,
    email: string | null | undefined,
    nationalId: string | null | undefined,
  ): Promise<PayerIdentity> {
    const countryCode = await this.systemConfig.get(SystemConfigKey.PHONE_DEFAULT_COUNTRY_CODE);
    const normalisedPhone = normalisePhone(phone, countryCode);
    if (normalisedPhone === null) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        PAYERS_MESSAGES.INVALID_PHONE,
        HttpStatus.BAD_REQUEST,
        { phone },
      );
    }
    return {
      phone: normalisedPhone,
      email: normaliseEmail(email),
      nationalId: normaliseNationalId(nationalId),
    };
  }

  /**
   * Finds exact matches on normalised identity fields and records them as PENDING flags.
   * Flags are stored once per (payer, matched, field); the reverse direction is implied.
   */
  private async flagDuplicates(
    payer: Payer,
    identity: PayerIdentity,
  ): Promise<DuplicateFlagResponseDto[]> {
    const others = await this.prisma.payer.findMany({
      where: {
        id: { not: payer.id },
        OR: [
          { phone: identity.phone },
          ...(identity.email === null ? [] : [{ email: identity.email }]),
          ...(identity.nationalId === null ? [] : [{ nationalId: identity.nationalId }]),
        ],
      },
      select: { id: true, phone: true, email: true, nationalId: true },
    });
    const candidates = findDuplicateCandidates({ id: payer.id, ...identity }, others);
    const flags: DuplicateFlagResponseDto[] = [];
    for (const candidate of candidates) {
      const existing = await this.prisma.duplicateFlag.findFirst({
        where: {
          matchField: candidate.matchField,
          OR: [
            { payerId: payer.id, matchedPayerId: candidate.matchedPayerId },
            { payerId: candidate.matchedPayerId, matchedPayerId: payer.id },
          ],
        },
        include: FLAG_INCLUDE,
      });
      const flag =
        existing ??
        (await this.prisma.duplicateFlag.create({
          data: {
            payerId: payer.id,
            matchedPayerId: candidate.matchedPayerId,
            matchField: candidate.matchField,
          },
          include: FLAG_INCLUDE,
        }));
      flags.push(toDuplicateFlagView(flag));
    }
    return flags;
  }

  private async findOrThrow(id: string): Promise<Payer> {
    const payer = await this.prisma.payer.findUnique({ where: { id } });
    if (payer === null) {
      throw new AppException(ErrorCode.NOT_FOUND, PAYERS_MESSAGES.NOT_FOUND, HttpStatus.NOT_FOUND, {
        id,
      });
    }
    return payer;
  }
}
