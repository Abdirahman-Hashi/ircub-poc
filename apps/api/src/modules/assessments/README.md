# assessments

**Purpose.** Tax assessments with control numbers, the payment ledger and the brief's
"advanced filters" (Module 3.1, 3.5; D10, D11).

**Rules.**

- Amount: FIXED revenue type → the rate; PERCENT → rate % of `baseAmount` (required).
  Computed once at creation; later rate changes do not touch existing assessments.
- Control number: 10-digit shared sequence + 2 mod-97 check digits, allocated in the same
  transaction as the insert; unique across assessments and bills.
- Ledger: `paidAmount` and `status` (`PENDING → PART_PAID → PAID`, `CANCELLED` sticky) are
  changed only by `applyPayment`/`reversePayment`, which lock the row `FOR UPDATE`. Over-payment
  is rejected with `OVERPAYMENT`; only unpaid assessments can be cancelled.
- Filters: payer/TIN, revenue type, amount range, status, created range, due range, control
  number; `export.csv` renders the same filtered set (capped at `EXPORT_MAX_ROWS`).

**Endpoints.** `GET /assessments`, `GET /assessments/export.csv`, `GET /assessments/:id`
(`assessments.view`); `POST /assessments`, `POST /assessments/:id/cancel` (`assessments.create`).

**Testing.** Unit: `assessments.rules.spec.ts`. E2E: `test/registry.e2e-spec.ts`.
