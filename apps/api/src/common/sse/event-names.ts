/** SSE event types pushed through `GET /events`; keys into `AppEventPayloads`. */
export const SSE_EVENT = {
  HEARTBEAT: 'heartbeat',
  PAYMENT_UPDATED: 'payment.updated',
  PAYMENT_PERMANENTLY_FAILED: 'payment.permanently-failed',
  ALERT_CREATED: 'alert.created',
  FMIS_BATCH_UPDATED: 'fmis.batch.updated',
  BILLING_CYCLE_UPDATED: 'billing.cycle.updated',
} as const;
