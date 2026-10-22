import type { PaymentChannel } from '@ircub/shared';

import type { JOB } from './job-names';

export interface PaymentStatusCheckPayload {
  readonly paymentId: string;
}

export interface FmisPostBatchPayload {
  readonly batchId: string;
  /** Demo: ask the mock FMIS to fail (retry path). */
  readonly forceFailure?: boolean;
}

export interface ChannelReconcilePayload {
  readonly channel: PaymentChannel;
  /** ISO date `YYYY-MM-DD` (business day is UTC). */
  readonly date: string;
}

export interface BillRenderPdfPayload {
  readonly billId: string;
}

export interface NotificationSendPayload {
  readonly notificationId: string;
}

export interface DashboardRebuildSummariesPayload {
  readonly from: string;
  readonly to: string;
}

export interface AlertsEvaluatePayload {
  readonly asOf: string;
}

/** Payload contract per job name; keep one entry per `JOB` member. */
export interface JobPayloads {
  [JOB.PAYMENT_STATUS_CHECK]: PaymentStatusCheckPayload;
  [JOB.FMIS_POST_BATCH]: FmisPostBatchPayload;
  [JOB.CHANNEL_RECONCILE]: ChannelReconcilePayload;
  [JOB.BILL_RENDER_PDF]: BillRenderPdfPayload;
  [JOB.NOTIFICATION_SEND]: NotificationSendPayload;
  [JOB.DASHBOARD_REBUILD_SUMMARIES]: DashboardRebuildSummariesPayload;
  [JOB.ALERTS_EVALUATE]: AlertsEvaluatePayload;
}
