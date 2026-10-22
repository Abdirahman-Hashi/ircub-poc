import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { ErrorCode, type PaymentChannel, PaymentStatus } from '@ircub/shared';

import { AppException } from '../../common/errors/app.exception';
import { toDecimal } from '../../common/money/money.rules';
import { EventBus } from '../../common/sse/event-bus';
import { SSE_EVENT } from '../../common/sse/event-names';
import { PrismaService } from '../../prisma/prisma.service';
import { AssessmentsService } from '../assessments/assessments.service';
import { BillsService } from '../water/bills/bills.service';

import { PAYMENTS_MESSAGES } from './payments.messages';
import { decideSettlement } from './settlement.rules';

import type { SettlementOutcome, SettlementResult, SettlementSource } from './payments.types';
import type { TransactionClient } from '../../prisma/prisma.types';
import type { Payment, Prisma } from '@prisma/client';

/**
 * The one place a PENDING online payment becomes terminal (D15). Callbacks and status checks
 * both land here, so idempotency, amount verification and ledger application are decided
 * once (`settlement.rules.ts`) under a row lock.
 */
@Injectable()
export class PaymentSettlementService {
  private readonly logger = new Logger(PaymentSettlementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly assessments: AssessmentsService,
    private readonly bills: BillsService,
    private readonly events: EventBus,
  ) {}

  async settleByReference(
    channel: PaymentChannel,
    channelTxnRef: string,
    outcome: SettlementOutcome,
    source: SettlementSource,
    rawPayload: Prisma.InputJsonValue,
  ): Promise<SettlementResult> {
    const existing = await this.prisma.payment.findUnique({
      where: { channel_channelTxnRef: { channel, channelTxnRef } },
      select: { id: true },
    });
    if (existing === null) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        PAYMENTS_MESSAGES.NOT_FOUND,
        HttpStatus.NOT_FOUND,
        {
          channel,
          channelTxnRef,
        },
      );
    }
    return this.settle(existing.id, outcome, source, rawPayload);
  }

  async settle(
    paymentId: string,
    outcome: SettlementOutcome,
    source: SettlementSource,
    rawPayload: Prisma.InputJsonValue,
  ): Promise<SettlementResult> {
    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await this.lockForUpdate(tx, paymentId);
      const decision = decideSettlement(payment, outcome);
      if (decision === 'DUPLICATE') {
        return { paymentId, duplicate: true, status: payment.status, payment };
      }
      const updated =
        decision === 'CONFIRM'
          ? await this.confirm(tx, payment, outcome, rawPayload)
          : await this.fail(
              tx,
              payment,
              decision === 'MISMATCH'
                ? PAYMENTS_MESSAGES.AMOUNT_MISMATCH
                : PAYMENTS_MESSAGES.CHANNEL_FAILED,
              rawPayload,
            );
      return { paymentId, duplicate: false, status: updated.status, payment: updated };
    });
    this.logger.log({
      msg: 'payment settled',
      paymentId,
      source,
      status: result.status,
      duplicate: result.duplicate,
    });
    if (!result.duplicate) {
      this.events.emit(SSE_EVENT.PAYMENT_UPDATED, {
        paymentId,
        payerId: result.payment.payerId,
        status: result.status,
        controlNumber: result.payment.controlNumber,
        localAmount: result.payment.localAmount.toFixed(),
        failureReason: result.payment.failureReason,
      });
    }
    return { paymentId, duplicate: result.duplicate, status: result.status };
  }

  /**
   * Applies the local amount fixed at initiation to the assessment or bill. If the ledger
   * refuses it (e.g. the balance was settled by cash meanwhile), the money has still left the
   * payer, so the payment is recorded FAILED with the ledger's reason for a supervisor to
   * resolve rather than silently dropped (see ASSUMPTIONS.md).
   */
  private async confirm(
    tx: TransactionClient,
    payment: Payment,
    outcome: SettlementOutcome,
    rawPayload: Prisma.InputJsonValue,
  ): Promise<Payment> {
    const localAmount = toDecimal(payment.localAmount);
    try {
      if (payment.assessmentId !== null) {
        await this.assessments.applyPayment(tx, payment.assessmentId, localAmount);
      } else if (payment.billId !== null) {
        await this.bills.applyPayment(tx, payment.billId, localAmount);
      }
    } catch (error: unknown) {
      if (error instanceof AppException) {
        this.logger.error({
          msg: 'confirmed payment could not be applied',
          paymentId: payment.id,
          code: error.code,
        });
        return this.fail(tx, payment, error.message, rawPayload);
      }
      throw error;
    }
    return tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.CONFIRMED,
        paidAt:
          outcome.paidAt === undefined || outcome.paidAt === null
            ? new Date()
            : new Date(outcome.paidAt),
        callbackPayload: rawPayload,
        failureReason: null,
      },
    });
  }

  private fail(
    tx: TransactionClient,
    payment: Payment,
    reason: string,
    rawPayload: Prisma.InputJsonValue,
  ): Promise<Payment> {
    return tx.payment.update({
      where: { id: payment.id },
      data: { status: PaymentStatus.FAILED, failureReason: reason, callbackPayload: rawPayload },
    });
  }

  private async lockForUpdate(tx: TransactionClient, id: string): Promise<Payment> {
    await tx.$queryRaw`SELECT id FROM payment WHERE id = ${id}::uuid FOR UPDATE`;
    const row = await tx.payment.findUnique({ where: { id } });
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
