import { HttpStatus, Injectable, Logger } from '@nestjs/common';

import { ErrorCode, type PaymentChannel, PaymentStatus } from '@ircub/shared';

import { AppException } from '../../common/errors/app.exception';
import { toDecimal } from '../../common/money/money.rules';
import { EventBus } from '../../common/sse/event-bus';
import { SSE_EVENT } from '../../common/sse/event-names';
import { PrismaService } from '../../prisma/prisma.service';
import { AssessmentsService } from '../assessments/assessments.service';
import { SummaryService } from '../dashboard/summary.service';
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
    private readonly summaries: SummaryService,
  ) {}

  /**
   * Finds the payment by the channel's reference. When the initiation reply was lost (timeout
   * after the channel accepted), the payment is FAILED without a `channelTxnRef`; the channel
   * echoes our `clientRef` (the payment id), so the reference is adopted and the outcome applied.
   */
  async settleByReference(
    channel: PaymentChannel,
    channelTxnRef: string,
    outcome: SettlementOutcome,
    source: SettlementSource,
    rawPayload: Prisma.InputJsonValue,
    clientRef: string | null = null,
  ): Promise<SettlementResult> {
    const existing = await this.prisma.payment.findUnique({
      where: { channel_channelTxnRef: { channel, channelTxnRef } },
      select: { id: true },
    });
    const paymentId =
      existing?.id ?? (await this.adoptReference(channel, channelTxnRef, clientRef));
    if (paymentId === null) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        PAYMENTS_MESSAGES.NOT_FOUND,
        HttpStatus.NOT_FOUND,
        { channel, channelTxnRef },
      );
    }
    return this.settle(paymentId, outcome, source, rawPayload);
  }

  /**
   * The one place a PENDING payment is given up on: the status-check job calls this once the
   * retry limit is reached. Row-locked and re-checked so a callback confirming the payment at
   * the same moment is never overwritten; returns `null` when the payment is no longer PENDING.
   */
  async markPermanentlyFailed(paymentId: string, reason: string): Promise<Payment | null> {
    return this.prisma.$transaction(async (tx) => {
      const payment = await this.lockForUpdate(tx, paymentId);
      if (payment.status !== PaymentStatus.PENDING) {
        return null;
      }
      return tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.PERMANENTLY_FAILED,
          permanentlyFailedAt: new Date(),
          failureReason: reason,
        },
      });
    });
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
      if (payment.status !== PaymentStatus.PENDING) {
        this.logger.warn({
          msg: 'late channel outcome re-opens a failed payment',
          paymentId,
          source,
          previousStatus: payment.status,
          decision,
        });
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
    if (!result.duplicate && result.status === PaymentStatus.CONFIRMED) {
      this.summaries.markDirty(result.payment.paidAt ?? new Date());
    }
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
        permanentlyFailedAt: null,
      },
    });
  }

  /** Adopts the channel reference onto the FAILED-at-initiation payment the channel named. */
  private async adoptReference(
    channel: PaymentChannel,
    channelTxnRef: string,
    clientRef: string | null,
  ): Promise<string | null> {
    if (clientRef === null) {
      return null;
    }
    const orphan = await this.prisma.payment.findFirst({
      where: {
        id: clientRef,
        channel,
        channelTxnRef: null,
        status: PaymentStatus.FAILED,
      },
      select: { id: true },
    });
    if (orphan === null) {
      return null;
    }
    await this.prisma.payment.update({
      where: { id: orphan.id },
      data: { channelTxnRef },
    });
    this.logger.warn({
      msg: 'channel reference adopted from callback',
      paymentId: orphan.id,
      channel,
      channelTxnRef,
    });
    return orphan.id;
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
