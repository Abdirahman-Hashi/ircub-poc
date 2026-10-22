import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { ErrorCode, PaymentStatus } from '@ircub/shared';
import type { ChannelInitiateRequest } from '@ircub/shared';

import { AppException } from '../../common/errors/app.exception';
import { JOB } from '../../common/jobs/job-names';
import { JobsService } from '../../common/jobs/jobs.service';
import { AMOUNT_SCALE } from '../../common/money/money.constants';
import { toDecimal } from '../../common/money/money.rules';
import { EventBus } from '../../common/sse/event-bus';
import { SSE_EVENT } from '../../common/sse/event-names';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AssessmentsService } from '../assessments/assessments.service';
import { callbackUrlFor } from '../channels/channels.rules';
import { ChannelsService } from '../channels/channels.service';
import { FxService } from '../fx/fx.service';
import { PayersService } from '../payers/payers.service';
import { SystemConfigKey } from '../system-config/system-config.keys';
import { SystemConfigService } from '../system-config/system-config.service';
import { BillsService } from '../water/bills/bills.service';

import { PAYMENTS_MESSAGES } from './payments.messages';
import { PaymentsService } from './payments.service';
import { PAYMENT_INCLUDE, toPaymentView } from './payments.view';

import type { InitiatePaymentDto } from './dto/initiate-payment.dto';
import type { PaymentResponseDto } from './dto/payment.response.dto';

/**
 * Online payment initiation (brief Module 5; D15). The amount is converted and the local
 * amount fixed at initiation so a callback cannot change what is applied to the ledger. The
 * row is INITIATED before the channel is called, so an outage leaves a FAILED trace, and
 * PENDING once the channel returns its reference; settlement happens in
 * `PaymentSettlementService` through the callback or the status-check job.
 */
@Injectable()
export class PaymentInitiationService {
  private readonly logger = new Logger(PaymentInitiationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly assessments: AssessmentsService,
    private readonly bills: BillsService,
    private readonly payers: PayersService,
    private readonly fx: FxService,
    private readonly channels: ChannelsService,
    private readonly jobs: JobsService,
    private readonly events: EventBus,
    private readonly config: AppConfigService,
    private readonly systemConfig: SystemConfigService,
  ) {}

  /** `ownPayerId` restricts the target to the caller's own payer (customer portal). */
  async initiate(
    dto: InitiatePaymentDto,
    actorId: string,
    ownPayerId: string | null,
  ): Promise<PaymentResponseDto> {
    const client = this.channels.clientFor(dto.channel);
    const lookup = await this.payments.lookup(dto.controlNumber);
    if (ownPayerId !== null && lookup.payer.id !== ownPayerId) {
      throw new AppException(
        ErrorCode.NOT_OWN_PAYER,
        PAYMENTS_MESSAGES.NOT_OWN_PAYER,
        HttpStatus.FORBIDDEN,
      );
    }
    await this.payers.assertActive(lookup.payer.id);
    const assessment =
      lookup.kind === 'ASSESSMENT'
        ? await this.assessments.findByControlNumber(lookup.controlNumber)
        : null;
    const bill =
      lookup.kind === 'BILL' ? await this.bills.findByBillNumber(lookup.controlNumber) : null;
    const amount = toDecimal(dto.amount);
    const conversion = await this.fx.toLocal(amount, dto.currency);
    if (conversion.localAmount.gt(toDecimal(lookup.outstanding))) {
      throw new AppException(
        ErrorCode.OVERPAYMENT,
        PAYMENTS_MESSAGES.OVERPAYMENT,
        HttpStatus.UNPROCESSABLE_ENTITY,
        {
          outstanding: lookup.outstanding,
          attempted: conversion.localAmount.toFixed(),
        },
      );
    }

    // Channels and statements carry money as fixed two-decimal strings (apps/mocks/CLAUDE.md).
    const request: ChannelInitiateRequest = {
      amount: amount.toFixed(AMOUNT_SCALE),
      currency: dto.currency,
      controlNumber: lookup.controlNumber,
      callbackUrl: callbackUrlFor(this.config.apiPublicUrl, dto.channel),
      ...(dto.payerPhone === undefined ? {} : { payerPhone: dto.payerPhone }),
    };
    const initiated = await this.prisma.payment.create({
      data: {
        controlNumber: lookup.controlNumber,
        assessmentId: assessment?.id ?? null,
        billId: bill?.id ?? null,
        payerId: lookup.payer.id,
        channel: dto.channel,
        amount: amount.toFixed(),
        currency: dto.currency,
        fxRate: conversion.fxRate.toFixed(),
        fxRateAt: conversion.fxRateAt,
        localAmount: conversion.localAmount.toFixed(),
        status: PaymentStatus.INITIATED,
        capturedById: actorId,
        channelRequestPayload: { ...request },
      },
    });

    let txnRef: string;
    try {
      txnRef = (await client.initiate(request)).txnRef;
    } catch (error: unknown) {
      await this.prisma.payment.update({
        where: { id: initiated.id },
        data: { status: PaymentStatus.FAILED, failureReason: PAYMENTS_MESSAGES.INITIATION_FAILED },
      });
      this.logger.warn({
        msg: 'channel refused initiation',
        paymentId: initiated.id,
        channel: dto.channel,
      });
      throw error;
    }

    const pending = await this.prisma.payment.update({
      where: { id: initiated.id },
      data: { channelTxnRef: txnRef, status: PaymentStatus.PENDING },
      include: PAYMENT_INCLUDE,
    });
    await this.scheduleStatusCheck(pending.id);
    this.events.emit(SSE_EVENT.PAYMENT_UPDATED, {
      paymentId: pending.id,
      payerId: pending.payerId,
      status: pending.status,
      controlNumber: pending.controlNumber,
      localAmount: pending.localAmount.toFixed(),
      failureReason: null,
    });
    this.logger.log({
      msg: 'payment initiated',
      paymentId: pending.id,
      channel: dto.channel,
      txnRef,
    });
    return toPaymentView(pending);
  }

  /** First check after the callback grace period; pg-boss retries with backoff up to the limit. */
  private async scheduleStatusCheck(paymentId: string): Promise<void> {
    const [startAfter, retryLimit, retryDelay] = await Promise.all([
      this.systemConfig.get(SystemConfigKey.PAYMENT_STATUS_CHECK_DELAY_SECONDS),
      this.systemConfig.get(SystemConfigKey.PAYMENT_STATUS_RETRY_LIMIT),
      this.systemConfig.get(SystemConfigKey.PAYMENT_STATUS_RETRY_DELAY_SECONDS),
    ]);
    await this.jobs.enqueue(
      JOB.PAYMENT_STATUS_CHECK,
      { paymentId },
      { startAfter, retryLimit, retryDelay, retryBackoff: true },
    );
  }
}
