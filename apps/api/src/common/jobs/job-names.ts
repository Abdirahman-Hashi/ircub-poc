/**
 * Every pg-boss queue name, declared once (standards §1). A job name is also the key into
 * `JobPayloads` (job-payloads.ts), which is what makes `JobsService.enqueue` type-safe.
 */
export const JOB = {
  PAYMENT_STATUS_CHECK: 'payment.status-check',
  FMIS_POST_BATCH: 'fmis.post-batch',
  CHANNEL_RECONCILE: 'channel.reconcile',
  BILL_RENDER_PDF: 'billing.render-pdf',
  NOTIFICATION_SEND: 'notification.send',
  DASHBOARD_REBUILD_SUMMARIES: 'dashboard.rebuild-summaries',
  ALERTS_EVALUATE: 'alerts.evaluate',
} as const;

export const JOB_NAMES = Object.values(JOB);
