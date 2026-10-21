import type { NotificationChannel } from '@ircub/shared';

/** What a gateway needs to deliver one message. */
export interface OutboundMessage {
  readonly channel: NotificationChannel;
  readonly to: string;
  readonly subject: string | null;
  readonly body: string;
}

/** Contract for SMS/email delivery; the HTTP implementation talks to the mock gateway. */
export interface NotificationSender {
  send(message: OutboundMessage): Promise<void>;
}

export interface QueueNotificationInput extends OutboundMessage {
  readonly relatedType: string | null;
  readonly relatedId: string | null;
}
