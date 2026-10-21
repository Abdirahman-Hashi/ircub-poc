import { Inject, Injectable, Logger } from '@nestjs/common';

import { NotificationStatus, type Paginated } from '@ircub/shared';

import { parseSort, toPageSlice, toPaginated } from '../../common/pagination/pagination.rules';
import { PrismaService } from '../../prisma/prisma.service';

import { NOTIFICATION_SENDER, NOTIFICATIONS_API } from './notifications.constants';

import type { NotificationFilterDto } from './dto/notification-filter.dto';
import type { NotificationResponseDto } from './dto/notification.response.dto';
import type { NotificationSender, QueueNotificationInput } from './notifications.types';
import type { Notification, Prisma } from '@prisma/client';

/**
 * Records every outbound message as a `Notification` row and delivers it through the
 * injected sender (D20). Delivery failures are stored on the row, never thrown to callers,
 * so a gateway outage cannot block a billing release.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(NOTIFICATION_SENDER) private readonly sender: NotificationSender,
  ) {}

  /** Creates the row and attempts delivery immediately; returns the final row. */
  async sendNow(input: QueueNotificationInput): Promise<Notification> {
    const queued = await this.prisma.notification.create({
      data: {
        channel: input.channel,
        to: input.to,
        subject: input.subject,
        body: input.body,
        relatedType: input.relatedType,
        relatedId: input.relatedId,
      },
    });
    try {
      await this.sender.send(input);
      return await this.prisma.notification.update({
        where: { id: queued.id },
        data: { status: NotificationStatus.SENT, sentAt: new Date() },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn({
        msg: 'notification delivery failed',
        notificationId: queued.id,
        channel: input.channel,
        error: message,
      });
      return this.prisma.notification.update({
        where: { id: queued.id },
        data: { status: NotificationStatus.FAILED, error: message },
      });
    }
  }

  async list(filter: NotificationFilterDto): Promise<Paginated<NotificationResponseDto>> {
    const where: Prisma.NotificationWhereInput = {
      ...(filter.status === undefined ? {} : { status: filter.status }),
      ...(filter.channel === undefined ? {} : { channel: filter.channel }),
      ...(filter.relatedType === undefined ? {} : { relatedType: filter.relatedType }),
      ...(filter.relatedId === undefined ? {} : { relatedId: filter.relatedId }),
    };
    const sort = parseSort(filter.sort, NOTIFICATIONS_API.SORTABLE, {
      field: 'createdAt',
      direction: 'desc',
    });
    const { skip, take } = toPageSlice(filter.page, filter.pageSize);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { [sort.field]: sort.direction },
      }),
      this.prisma.notification.count({ where }),
    ]);
    return toPaginated(rows.map(toView), total, filter.page, filter.pageSize);
  }
}

function toView(row: Notification): NotificationResponseDto {
  return {
    id: row.id,
    channel: row.channel,
    to: row.to,
    subject: row.subject,
    body: row.body,
    status: row.status,
    relatedType: row.relatedType,
    relatedId: row.relatedId,
    sentAt: row.sentAt,
    error: row.error,
    createdAt: row.createdAt,
  };
}
