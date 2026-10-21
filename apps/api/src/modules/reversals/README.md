# reversals

**Purpose.** Reversal requests on confirmed payments with supervisor approval and the
per-record segregation-of-duties rule (brief Module 1 & 3, D7).

**Rules.**

- Only `CONFIRMED` payments can be reversed; one pending request per payment.
- **SoD hard rule:** `capturedById === deciderId` → `403 SOD_VIOLATION` on approve _and_
  reject, checked in the service regardless of permissions (the role-level rule in
  `modules/sod` is the second, configurable layer).
- Approve runs in one transaction: payment → `REVERSED`, assessment `paidAmount` reduced and
  status recomputed (`reversePayment` rule, row locked). Audit rows capture before/after.
- Phase 5 adds the FMIS reversing journal batch on approval.

**Endpoints.** `GET /reversals`, `GET /reversals/:id` (`payments.view`); `POST /reversals`
(`reversals.capture`); `POST /reversals/:id/approve|reject` (`reversals.approve`).

**Testing.** Unit: `reversals.rules.spec.ts`. E2E: `test/revenue.e2e-spec.ts` (capturer cannot
approve own reversal; supervisor approval reverses the ledger).
