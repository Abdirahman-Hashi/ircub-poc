# notifications

**Purpose.** Outbound SMS and email with a stored delivery record (D20). Used by bill release
(phase 3) and payment failure escalation (phase 4).

**Rules.**

- `NotificationSender` is the interface; `HttpNotificationSender` posts to the mock gateway
  (`MOCKS_BASE_URL` + `/sms` | `/email`). Tests inject a fake through the `NOTIFICATION_SENDER` token.
- Every message is a `Notification` row first (QUEUED), then SENT with `sentAt` or FAILED with
  the error. Delivery failures never propagate to the caller.

**Endpoints.** `GET /notifications?status&channel&relatedType&relatedId` — `bills.view`.

**Testing.** E2E: `test/water-billing.e2e-spec.ts` asserts rows exist after a release (status
FAILED when the mock gateway is not running, SENT when it is).
