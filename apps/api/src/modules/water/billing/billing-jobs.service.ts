import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import { NotificationChannel, NotificationStatus } from '@ircub/shared';

import { JOB } from '../../../common/jobs/job-names';
import { JobsService } from '../../../common/jobs/jobs.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NOTIFICATION_RELATED } from '../../notifications/notifications.constants';
import { NotificationsService } from '../../notifications/notifications.service';
import { SystemConfigKey } from '../../system-config/system-config.keys';
import { SystemConfigService } from '../../system-config/system-config.service';
import { BillsService } from '../bills/bills.service';
import { BILL_INCLUDE } from '../water.view';

import { BILL_NOTIFICATION } from './billing.constants';
import { BillingService } from './billing.service';

/** Post-release work per bill (D14, D19, D20): render the PDF, then SMS + email the payer. */
@Injectable()
export class BillingJobsService implements OnModuleInit {
  private readonly logger = new Logger(BillingJobsService.name);

  constructor(
    private readonly jobs: JobsService,
    private readonly prisma: PrismaService,
    private readonly bills: BillsService,
    private readonly billing: BillingService,
    private readonly notifications: NotificationsService,
    private readonly systemConfig: SystemConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.jobs.register(JOB.BILL_RENDER_PDF, async ({ billId }) =>
      this.renderAndNotify(billId),
    );
  }

  async renderAndNotify(billId: string): Promise<void> {
    const bill = await this.prisma.bill.findUnique({
      where: { id: billId },
      include: { ...BILL_INCLUDE, payer: true },
    });
    if (bill === null) {
      this.logger.warn({ msg: 'bill job: bill missing', billId });
      return;
    }
    await this.bills.ensurePdf(bill.id);

    const [sms, email] = await Promise.all([
      this.systemConfig.get(SystemConfigKey.BILL_NOTIFICATION_SMS),
      this.systemConfig.get(SystemConfigKey.BILL_NOTIFICATION_EMAIL),
    ]);
    const dueDate = bill.dueDate.toISOString().slice(0, 'YYYY-MM-DD'.length);
    const totalDue = bill.totalDue.toFixed();
    let sent = 0;
    if (sms) {
      const row = await this.notifications.sendNow({
        channel: NotificationChannel.SMS,
        to: bill.payer.phone,
        subject: null,
        body: BILL_NOTIFICATION.SMS_TEMPLATE(
          bill.billNumber,
          bill.cycle.period,
          totalDue,
          bill.currency,
          dueDate,
        ),
        relatedType: NOTIFICATION_RELATED.BILL,
        relatedId: bill.id,
      });
      sent += row.status === NotificationStatus.SENT ? 1 : 0;
    }
    if (email && bill.payer.email !== null) {
      const row = await this.notifications.sendNow({
        channel: NotificationChannel.EMAIL,
        to: bill.payer.email,
        subject: BILL_NOTIFICATION.EMAIL_SUBJECT(bill.cycle.period),
        body: BILL_NOTIFICATION.EMAIL_TEMPLATE(
          bill.payer.name,
          bill.billNumber,
          bill.cycle.period,
          totalDue,
          bill.currency,
          dueDate,
        ),
        relatedType: NOTIFICATION_RELATED.BILL,
        relatedId: bill.id,
      });
      sent += row.status === NotificationStatus.SENT ? 1 : 0;
    }
    if (sent > 0) {
      await this.billing.incrementNotificationsSent(bill.cycleId, sent);
    }
  }
}
