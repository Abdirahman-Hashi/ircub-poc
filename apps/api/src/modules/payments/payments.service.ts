import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { ErrorCode, type Paginated, PaymentChannel, PaymentStatus } from '@ircub/shared';

import { AppException } from '../../common/errors/app.exception';
import { isValidControlNumber, normaliseControlNumber } from '../../common/ids/ids.rules';
import { toDecimal } from '../../common/money/money.rules';
import { parseSort, toPageSlice, toPaginated } from '../../common/pagination/pagination.rules';
import { PrismaService } from '../../prisma/prisma.service';
import { AssessmentsService } from '../assessments/assessments.service';
import { outstandingOf, outstandingOf as billOutstandingOf } from '../assessments/assessments.view';
import { FxService } from '../fx/fx.service';
import { PayersService } from '../payers/payers.service';
import { BillsService } from '../water/bills/bills.service';

import { PAYMENTS_API } from './payments.constants';
import { PAYMENTS_MESSAGES } from './payments.messages';
import { PAYMENT_INCLUDE, toPaymentDetail, toPaymentView } from './payments.view';

import type { CapturePaymentDto } from './dto/capture-payment.dto';
import type { ControlNumberLookupResponseDto } from './dto/control-number-lookup.response.dto';
import type { PaymentDetailResponseDto } from './dto/payment-detail.response.dto';
import type { PaymentFilterDto } from './dto/payment-filter.dto';
import type { PaymentResponseDto } from './dto/payment.response.dto';
import type { ConfirmedPaymentInput, PaymentWithRelations } from './payments.types';
import type { TransactionClient } from '../../prisma/prisma.types';
import type { Prisma } from '@prisma/client';

/**
 * Manual capture and the payment ledger (brief Module 3.2). Online channels (phase 4) and the
 * bulk importer reuse `recordConfirmedPayment` so there is exactly one way a payment is
 * applied to an assessment.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly assessments: AssessmentsService,
    private readonly payers: PayersService,
    private readonly fx: FxService,
    private readonly bills: BillsService,
  ) {}

  /** What the cashier sees before capturing: payer, description, outstanding. */
  async lookup(controlNumber: string): Promise<ControlNumberLookupResponseDto> {
    const normalised = normaliseControlNumber(controlNumber);
    if (!isValidControlNumber(normalised)) {
      throw new AppException(
        ErrorCode.INVALID_CONTROL_NUMBER,
        PAYMENTS_MESSAGES.INVALID_CONTROL_NUMBER,
        HttpStatus.BAD_REQUEST,
        {
          controlNumber,
        },
      );
    }
    const assessment = await this.assessments.findByControlNumber(normalised);
    if (assessment === null) {
      // Control numbers are unique across assessments and bills (D10): try the bill ledger.
      const bill = await this.bills.findByBillNumber(normalised);
      if (bill === null) {
        throw new AppException(
          ErrorCode.NOT_FOUND,
          PAYMENTS_MESSAGES.UNKNOWN_CONTROL_NUMBER,
          HttpStatus.NOT_FOUND,
          { controlNumber },
        );
      }
      return {
        controlNumber: bill.billNumber,
        kind: 'BILL',
        payer: bill.payer,
        description: `Water bill ${bill.cycle.period} · ${bill.account.accountNumber}`,
        amount: bill.totalDue.toFixed(),
        paidAmount: bill.paidAmount.toFixed(),
        outstanding: billOutstandingOf(bill.totalDue, bill.paidAmount).toFixed(),
        currency: bill.currency,
        status: bill.status,
      };
    }
    return {
      controlNumber: assessment.controlNumber,
      kind: 'ASSESSMENT',
      payer: assessment.payer,
      description:
        assessment.period === null
          ? assessment.revenueType.name
          : `${assessment.revenueType.name} · ${assessment.period}`,
      amount: assessment.amount.toFixed(),
      paidAmount: assessment.paidAmount.toFixed(),
      outstanding: outstandingOf(assessment.amount, assessment.paidAmount).toFixed(),
      currency: assessment.currency,
      status: assessment.status,
    };
  }

  async capture(dto: CapturePaymentDto, actorId: string): Promise<PaymentResponseDto> {
    const lookup = await this.lookup(dto.controlNumber);
    const assessment =
      lookup.kind === 'ASSESSMENT'
        ? await this.assessments.findByControlNumber(lookup.controlNumber)
        : null;
    const bill =
      lookup.kind === 'BILL' ? await this.bills.findByBillNumber(lookup.controlNumber) : null;
    const target = assessment ?? bill;
    if (target === null) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        PAYMENTS_MESSAGES.UNKNOWN_CONTROL_NUMBER,
        HttpStatus.NOT_FOUND,
      );
    }
    await this.payers.assertActive(target.payerId);
    const channelTxnRef = dto.channelTxnRef?.trim() ?? null;
    if (
      dto.channel !== PaymentChannel.CASH &&
      (channelTxnRef === null || channelTxnRef.length === 0)
    ) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        PAYMENTS_MESSAGES.TXN_REF_REQUIRED,
        HttpStatus.BAD_REQUEST,
      );
    }
    if (channelTxnRef !== null && (await this.txnRefExists(dto.channel, channelTxnRef))) {
      throw new AppException(
        ErrorCode.DUPLICATE_PAYMENT,
        PAYMENTS_MESSAGES.DUPLICATE_TXN_REF,
        HttpStatus.CONFLICT,
        {
          channel: dto.channel,
          channelTxnRef,
        },
      );
    }

    const payment = await this.prisma.$transaction((tx) =>
      this.recordConfirmedPayment(tx, {
        assessmentId: assessment?.id ?? null,
        billId: bill?.id ?? null,
        payerId: target.payerId,
        controlNumber: lookup.controlNumber,
        channel: dto.channel,
        channelTxnRef,
        amount: toDecimal(dto.amount),
        currency: dto.currency,
        paidAt: dto.paidAt ?? new Date(),
        capturedById: actorId,
        bulkUploadId: null,
      }),
    );
    this.logger.log({
      msg: 'payment captured',
      paymentId: payment.id,
      controlNumber: payment.controlNumber,
      localAmount: payment.localAmount,
    });
    return toPaymentView(payment);
  }

  /**
   * Converts to local currency, applies the amount to the assessment (locked, over-payment
   * rejected) and inserts a CONFIRMED payment — all inside the caller's transaction.
   */
  async recordConfirmedPayment(
    tx: TransactionClient,
    input: ConfirmedPaymentInput,
  ): Promise<PaymentWithRelations> {
    const conversion = await this.fx.toLocal(input.amount, input.currency);
    if (input.assessmentId !== null) {
      await this.assessments.applyPayment(tx, input.assessmentId, conversion.localAmount);
    } else if (input.billId !== null) {
      await this.bills.applyPayment(tx, input.billId, conversion.localAmount);
    }
    return tx.payment.create({
      data: {
        controlNumber: input.controlNumber,
        assessmentId: input.assessmentId,
        billId: input.billId,
        payerId: input.payerId,
        channel: input.channel,
        channelTxnRef: input.channelTxnRef,
        amount: input.amount.toFixed(),
        currency: input.currency,
        fxRate: conversion.fxRate.toFixed(),
        fxRateAt: conversion.fxRateAt,
        localAmount: conversion.localAmount.toFixed(),
        status: PaymentStatus.CONFIRMED,
        paidAt: input.paidAt,
        capturedById: input.capturedById,
        bulkUploadId: input.bulkUploadId,
      },
      include: PAYMENT_INCLUDE,
    });
  }

  async txnRefExists(channel: PaymentChannel, channelTxnRef: string): Promise<boolean> {
    const existing = await this.prisma.payment.findUnique({
      where: { channel_channelTxnRef: { channel, channelTxnRef } },
      select: { id: true },
    });
    return existing !== null;
  }

  async list(filter: PaymentFilterDto): Promise<Paginated<PaymentResponseDto>> {
    const where: Prisma.PaymentWhereInput = {
      ...(filter.payerId === undefined ? {} : { payerId: filter.payerId }),
      ...(filter.revenueTypeId === undefined
        ? {}
        : { assessment: { revenueTypeId: filter.revenueTypeId } }),
      ...(filter.channel === undefined ? {} : { channel: filter.channel }),
      ...(filter.status === undefined ? {} : { status: filter.status }),
      ...(filter.currency === undefined ? {} : { currency: filter.currency }),
      ...(filter.controlNumber === undefined
        ? {}
        : { controlNumber: normaliseControlNumber(filter.controlNumber) }),
      ...(filter.bulkUploadId === undefined ? {} : { bulkUploadId: filter.bulkUploadId }),
      ...(filter.amountMin === undefined && filter.amountMax === undefined
        ? {}
        : {
            localAmount: {
              ...(filter.amountMin === undefined ? {} : { gte: filter.amountMin }),
              ...(filter.amountMax === undefined ? {} : { lte: filter.amountMax }),
            },
          }),
      ...(filter.dateFrom === undefined && filter.dateTo === undefined
        ? {}
        : {
            paidAt: {
              ...(filter.dateFrom === undefined ? {} : { gte: filter.dateFrom }),
              ...(filter.dateTo === undefined ? {} : { lte: filter.dateTo }),
            },
          }),
    };
    const sort = parseSort(filter.sort, PAYMENTS_API.SORTABLE, {
      field: 'createdAt',
      direction: 'desc',
    });
    const { skip, take } = toPageSlice(filter.page, filter.pageSize);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        skip,
        take,
        orderBy: { [sort.field]: sort.direction },
        include: PAYMENT_INCLUDE,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return toPaginated(rows.map(toPaymentView), total, filter.page, filter.pageSize);
  }

  async get(id: string): Promise<PaymentResponseDto> {
    return toPaymentView(await this.findOrThrow(id));
  }

  async getDetail(id: string): Promise<PaymentDetailResponseDto> {
    return toPaymentDetail(await this.findOrThrow(id));
  }

  async findOrThrow(id: string): Promise<PaymentWithRelations> {
    const row = await this.prisma.payment.findUnique({ where: { id }, include: PAYMENT_INCLUDE });
    if (row === null) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        PAYMENTS_MESSAGES.NOT_FOUND,
        HttpStatus.NOT_FOUND,
        { id },
      );
    }
    return row;
  }
}
