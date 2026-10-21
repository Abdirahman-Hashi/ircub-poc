import { Global, Module } from '@nestjs/common';

import { HttpNotificationSender } from './http-notification.sender';
import { NOTIFICATION_SENDER } from './notifications.constants';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    { provide: NOTIFICATION_SENDER, useClass: HttpNotificationSender },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
