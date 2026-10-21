import { Injectable, Logger } from '@nestjs/common';

import { NotificationChannel } from '@ircub/shared';

import { AppConfigService } from '../../config/app-config.service';

import { NOTIFICATIONS_API } from './notifications.constants';

import type { NotificationSender, OutboundMessage } from './notifications.types';

/** Delivers through the mock gateway (`POST /sms`, `POST /email`); swapped for a real one by DI. */
@Injectable()
export class HttpNotificationSender implements NotificationSender {
  private readonly logger = new Logger(HttpNotificationSender.name);

  constructor(private readonly config: AppConfigService) {}

  async send(message: OutboundMessage): Promise<void> {
    const path =
      message.channel === NotificationChannel.SMS
        ? NOTIFICATIONS_API.SMS_PATH
        : NOTIFICATIONS_API.EMAIL_PATH;
    const payload =
      message.channel === NotificationChannel.SMS
        ? { to: message.to, body: message.body }
        : { to: message.to, subject: message.subject ?? '', body: message.body };
    const response = await fetch(`${this.config.mocksBaseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(NOTIFICATIONS_API.TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`gateway responded ${response.status}`);
    }
    this.logger.debug({ msg: 'notification delivered', channel: message.channel, to: message.to });
  }
}
