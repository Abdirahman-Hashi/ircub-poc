# payments

**Purpose.** The payment ledger (brief Module 3.2, 3.5, Module 5; D9, D11, D15): manual
capture, online initiation through bank / mobile-money channels, signed callbacks, status-check
retries with permanent failure, and the payments list with filters.

**Rules.**

- `recordConfirmedPayment` is the single path that converts to local currency (FX service),
  applies the amount to the locked assessment or bill (over-payment → `OVERPAYMENT`) and
  inserts a `CONFIRMED` payment. Manual capture and the bulk importer use it.
- Online payments (`PaymentInitiationService`): the amount is converted and the local amount
  fixed at initiation; the row is `INITIATED` before the channel is called (an outage leaves a
  `FAILED` trace), then `PENDING` with the channel's `channelTxnRef`, and a
  `payment.status-check` job is scheduled after `PAYMENT_STATUS_CHECK_DELAY_SECONDS`.
- Settlement (`PaymentSettlementService` + `settlement.rules.ts`) is the only place a `PENDING`
  payment becomes terminal, under a row lock: a settled payment (`CONFIRMED`/`REVERSED`)
  answers `duplicate: true` (idempotent callbacks), `FAILED` from the channel → `FAILED`, an
  amount/currency different from what was initiated → `FAILED` with `AMOUNT_MISMATCH` reason,
  otherwise the ledger is applied and the payment is `CONFIRMED`. A late `SUCCESS` for a
  `FAILED` or `PERMANENTLY_FAILED` payment is applied too (the channel did take the money);
  a repeat `FAILED` is a duplicate. If the ledger refuses (balance settled meanwhile), the
  payment is `FAILED` with that reason for a supervisor to resolve, never dropped.
- The payment id travels to the channel as `clientRef`. If the initiation reply (and its
  `txnRef`) is lost to a timeout, the payment is `FAILED` without a reference; the channel
  echoes `clientRef` in its callback, so `settleByReference` adopts the `txnRef` onto that
  payment and settles it instead of answering 404.
- `markPermanentlyFailed` (also in the settlement service) re-reads the locked row and only
  gives up on a payment that is still `PENDING`, so a callback confirming it at the same
  moment is never overwritten.
- Callbacks are trusted only through the HMAC over the raw body (`x-signature`,
  `MOCK_SHARED_SECRET`, constant-time) → `INVALID_SIGNATURE` (401) otherwise.
- `PaymentStatusCheckService` handles the job: no-op unless still `PENDING`; a final answer
  from the channel settles; `PENDING` or an error increments `statusCheckAttempts` and throws
  so pg-boss retries with backoff (`PAYMENT_STATUS_RETRY_DELAY_SECONDS`). Reaching
  `PAYMENT_STATUS_RETRY_LIMIT` marks `PERMANENTLY_FAILED`, e-mails every user holding
  `payments.supervise` (permission, not role) and emits `payment.permanently-failed`.
- Every change emits `payment.updated` on the SSE bus; customers receive only their payer's.
- `(channel, channelTxnRef)` is unique at the database so a replayed reference is never a
  second payment; customers can initiate only against their own payer (`NOT_OWN_PAYER`).

**Endpoints.** `GET /payments`, `GET /payments/:id` (detail with channel request/callback
payloads) (`payments.view`); `GET /payments/capture/lookup`, `POST /payments/capture`,
`POST /payments/initiate` (`payments.capture`); `POST /me/payments/initiate` (`self.pay`);
`POST /payments/callback/:channel` (public, signed).

**Testing.** Unit: `settlement.rules.spec.ts` (duplicate, fail, mismatch, confirm, retry
counter), `payment-status-check.service.spec.ts` (pending → retry, error → retry, final answer
→ settle, limit → permanently failed + supervisor recipients, no-op when settled),
`channels.rules.spec.ts` (signatures). E2E: `test/channels.e2e-spec.ts` against an in-process
mocks app (`.00` → callback → CONFIRMED, tampered/replayed callback, `.66` →
PERMANENTLY_FAILED with notification, customer ownership), `test/revenue.e2e-spec.ts`.
