import type {
  AlertSeverity,
  AlertType,
  BillingCycleStatus,
  JournalBatchStatus,
  PaymentStatus,
} from '@ircub/shared';

import type { SSE_EVENT } from './event-names';

export interface HeartbeatPayload {
  readonly at: string;
}

export interface PaymentUpdatedPayload {
  readonly paymentId: string;
  readonly status: PaymentStatus;
  readonly controlNumber: string;
}

export interface AlertCreatedPayload {
  readonly alertId: string;
  readonly type: AlertType;
  readonly severity: AlertSeverity;
  readonly title: string;
}

export interface FmisBatchUpdatedPayload {
  readonly batchId: string;
  readonly status: JournalBatchStatus;
}

export interface BillingCycleUpdatedPayload {
  readonly cycleId: string;
  readonly status: BillingCycleStatus;
}

/** Payload per event type; one entry per `SSE_EVENT` member. */
export interface AppEventPayloads {
  [SSE_EVENT.HEARTBEAT]: HeartbeatPayload;
  [SSE_EVENT.PAYMENT_UPDATED]: PaymentUpdatedPayload;
  [SSE_EVENT.ALERT_CREATED]: AlertCreatedPayload;
  [SSE_EVENT.FMIS_BATCH_UPDATED]: FmisBatchUpdatedPayload;
  [SSE_EVENT.BILLING_CYCLE_UPDATED]: BillingCycleUpdatedPayload;
}
