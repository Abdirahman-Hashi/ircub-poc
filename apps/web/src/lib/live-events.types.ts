import type { AlertSeverity, AlertType, PaymentStatus, SseEnvelope } from '@ircub/shared';

export interface PaymentUpdatedEvent {
  readonly paymentId: string;
  readonly payerId: string;
  readonly status: PaymentStatus;
  readonly controlNumber: string;
  readonly localAmount: string;
  readonly failureReason: string | null;
}

export interface PaymentPermanentlyFailedEvent {
  readonly paymentId: string;
  readonly payerId: string;
  readonly controlNumber: string;
  readonly attempts: number;
}

export interface AlertCreatedEvent {
  readonly alertId: string;
  readonly type: AlertType;
  readonly severity: AlertSeverity;
  readonly title: string;
}

export type LiveEvent =
  | SseEnvelope<'payment.updated', PaymentUpdatedEvent>
  | SseEnvelope<'payment.permanently-failed', PaymentPermanentlyFailedEvent>
  | SseEnvelope<'alert.created', AlertCreatedEvent>;

export type LiveEventListener = (event: LiveEvent) => void;

export interface LiveEventsContextValue {
  readonly connected: boolean;
  /** Permanently failed payments seen in this session (supervisor bell). */
  readonly escalations: readonly PaymentPermanentlyFailedEvent[];
  readonly clearEscalations: () => void;
  readonly subscribe: (listener: LiveEventListener) => () => void;
}
