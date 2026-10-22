import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import {
  AlertSeverity,
  AlertType,
  ChannelOutcome,
  NotificationChannel,
  PaymentStatus,
  PERMISSIONS,
} from '@ircub/shared';
import type { ChannelStatusResponse } from '@ircub/shared';

import { JOB } from '../../common/jobs/job-names';
import { JobsService } from '../../common/jobs/jobs.service';
import { EventBus } from '../../common/sse/event-bus';
import { SSE_EVENT } from '../../common/sse/event-names';
import { PrismaService } from '../../prisma/prisma.service';
import { ChannelsService } from '../channels/channels.service';
import { AlertsService } from '../dashboard/alerts.service';
import { ALERT_TEXT } from '../dashboard/dashboard.constants';
import { NOTIFICATION_RELATED } from '../notifications/notifications.constants';
import { NotificationsService } from '../notifications/notifications.service';
import { PermissionsService } from '../permissions/permissions.service';
import { SystemConfigKey } from '../system-config/system-config.keys';
import { SystemConfigService } from '../system-config/system-config.service';

import { PaymentSettlementService } from './payment-settlement.service';
import { ESCALATION_EMAIL } from './payments.constants';
import { PAYMENTS_MESSAGES } from './payments.messages';
import { nextStatusCheck } from './settlement.rules';

import type { PaymentForStatusCheck } from './payments.types';

/**
 * `payment.status-check` job (D15). Runs when no callback arrived in time: asks the channel,
 * settles a final answer, or counts the attempt and throws so pg-boss retries. Once the
 * configured limit is reached the payment is PERMANENTLY_FAILED and every user holding
 * `payments.supervise` is e-mailed.
 */
@Injectable()
export class PaymentStatusCheckService implements OnModuleInit {
  private readonly logger = new Logger(PaymentStatusCheckService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly channels: ChannelsService,
    private readonly settlement: PaymentSettlementService,
    private readonly notifications: NotificationsService,
    private readonly permissions: PermissionsService,
    private readonly systemConfig: SystemConfigService,
    private readonly jobs: JobsService,
    private readonly events: EventBus,
    private readonly alerts: AlertsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.jobs.register(JOB.PAYMENT_STATUS_CHECK, ({ paymentId }) => this.check(paymentId));
  }

  async check(paymentId: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        payerId: true,
        channel: true,
        channelTxnRef: true,
        controlNumber: true,
        status: true,
        statusCheckAttempts: true,
        localAmount: true,
      },
    });
    if (payment?.status !== PaymentStatus.PENDING || payment.channelTxnRef === null) {
      return; // Settled by a callback meanwhile: the job is a no-op.
    }
    const response = await this.askChannel(payment.channel, payment.channelTxnRef, paymentId);
    if (response !== null && response.status !== ChannelOutcome.PENDING) {
      await this.settlement.settle(
        paymentId,
        {
          status: response.status,
          amount: response.amount,
          currency: response.currency,
          paidAt: response.paidAt,
        },
        'STATUS_CHECK',
        { ...response },
      );
      return;
    }
    const limit = await this.systemConfig.get(SystemConfigKey.PAYMENT_STATUS_RETRY_LIMIT);
    const progress = nextStatusCheck(payment.statusCheckAttempts, limit);
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { statusCheckAttempts: progress.attempts, lastStatusCheckAt: new Date() },
    });
    if (progress.exhausted) {
      await this.markPermanentlyFailed(payment, progress.attempts);
      return;
    }
    throw new Error(PAYMENTS_MESSAGES.STATUS_STILL_PENDING);
  }

  private async askChannel(
    channel: PaymentForStatusCheck['channel'],
    txnRef: string,
    paymentId: string,
  ): Promise<ChannelStatusResponse | null> {
    try {
      return await this.channels.clientFor(channel).status(txnRef);
    } catch (error: unknown) {
      this.logger.warn({
        msg: 'status check failed',
        paymentId,
        channel,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private async markPermanentlyFailed(
    payment: PaymentForStatusCheck,
    attempts: number,
  ): Promise<void> {
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.PERMANENTLY_FAILED,
        permanentlyFailedAt: new Date(),
        failureReason: PAYMENTS_MESSAGES.PERMANENTLY_FAILED,
      },
    });
    this.logger.error({
      msg: 'payment permanently failed',
      paymentId: payment.id,
      channel: payment.channel,
      attempts,
    });
    await this.alerts.raise({
      type: AlertType.PAYMENT_PERMANENTLY_FAILED,
      severity: AlertSeverity.WARNING,
      title: ALERT_TEXT.PAYMENT_PERMANENTLY_FAILED.title,
      message: ALERT_TEXT.PAYMENT_PERMANENTLY_FAILED.message(
        payment.controlNumber,
        payment.channel,
        attempts,
      ),
      data: {
        paymentId: payment.id,
        controlNumber: payment.controlNumber,
        channel: payment.channel,
        attempts,
      },
      dedupeKey: payment.id,
    });
    const recipients = await this.supervisorEmails();
    for (const email of recipients) {
      await this.notifications.sendNow({
        channel: NotificationChannel.EMAIL,
        to: email,
        subject: ESCALATION_EMAIL.SUBJECT,
        body: ESCALATION_EMAIL.BODY(payment.controlNumber, payment.channel, attempts),
        relatedType: NOTIFICATION_RELATED.PAYMENT,
        relatedId: payment.id,
      });
    }
    this.events.emit(SSE_EVENT.PAYMENT_PERMANENTLY_FAILED, {
      paymentId: payment.id,
      payerId: payment.payerId,
      controlNumber: payment.controlNumber,
      attempts,
    });
    this.events.emit(SSE_EVENT.PAYMENT_UPDATED, {
      paymentId: payment.id,
      payerId: payment.payerId,
      status: PaymentStatus.PERMANENTLY_FAILED,
      controlNumber: payment.controlNumber,
      localAmount: payment.localAmount.toFixed(),
      failureReason: PAYMENTS_MESSAGES.PERMANENTLY_FAILED,
    });
  }

  /** Recipients are decided by permission, not role (CLAUDE.md rule 4). */
  async supervisorEmails(): Promise<string[]> {
    const userIds = await this.permissions.userIdsHolding(PERMISSIONS.PAYMENTS_SUPERVISE);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { email: true },
    });
    return users.map((user) => user.email);
  }
}
