# payments

**Purpose.** Manual payment capture (cash, bank, mobile money) and the payments list with
filters (brief Module 3.2, 3.5; D9, D11). Online initiation, callbacks and retries arrive in phase 4.

**Rules.**

- `recordConfirmedPayment` is the single path that converts to local currency (FX service),
  applies the amount to the locked assessment (over-payment → `OVERPAYMENT`) and inserts a
  `CONFIRMED` payment. Manual capture, the bulk importer and phase 4 callbacks all use it.
- Bank and mobile-money captures need a channel reference; `(channel, channelTxnRef)` is
  unique at the database so a duplicate is `DUPLICATE_PAYMENT`, never a second payment.
- Suspended payers cannot be paid against; cancelled or paid assessments are not payable.
- Every payment stores `amount`, `currency`, `fxRate`, `fxRateAt`, `localAmount`.

**Endpoints.** `GET /payments`, `GET /payments/:id` (`payments.view`);
`GET /payments/capture/lookup?controlNumber`, `POST /payments/capture` (`payments.capture`).

**Testing.** Unit: `assessments.rules.spec.ts` (application), `money.rules.spec.ts`.
E2E: `test/revenue.e2e-spec.ts` (capture, over-payment, duplicate reference).
