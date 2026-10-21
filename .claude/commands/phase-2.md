---
description: Phase 2 — payer registry with duplicate detection, revenue types, assessments with control numbers, bulk CSV uploader, reversals, advanced filters
---

Read `CLAUDE.md`, `docs/DECISIONS.md` (D7, D10–D12) and `docs/PROGRESS.md`. This phase
implements brief **Module 2 (Taxpayer & Customer Registry)** and **Module 3 (Tax Revenue
Assessment & Collection)** except the online payment channels (phase 4). Payments captured
here are manual/cash/bulk; the `Payment` model is created now so phase 4 only extends it.

## Standards reminder (applies to every file in this phase)
`docs/ENGINEERING-STANDARDS.md` is enforced by lint and `/review`: every threshold, limit,
duration, code, prefix, job/event name, message and URL is a named constant, a
`SystemConfigKey` (for runtime-tunable business parameters — add key, typed default and
seed entry together), an env value, or a shared enum; every `interface`/`type`/`enum` is in
`*.types.ts`, `dto/*.dto.ts` or `packages/shared`; business rules are pure functions in
`*.rules.ts` with unit tests; external HTTP sits behind an injected interface; each new
module gets a `README.md`. Before committing, run `pnpm lint` and fix, do not disable rules.

## Prisma models to add
`Payer` (id, tin unique, type INDIVIDUAL|BUSINESS, name, nationalId?, registrationNo?, phone,
email?, address?, status ACTIVE|SUSPENDED, createdById), `DuplicateFlag` (payerId,
matchedPayerId, matchField PHONE|EMAIL|NATIONAL_ID, status PENDING|CONFIRMED|DISMISSED,
reviewedById?, reviewedAt?, note?), `RevenueType` (code unique, name, rateType FIXED|PERCENT,
rate Decimal, glCode, active, description?), `Assessment` (controlNumber unique, payerId,
revenueTypeId, period?, baseAmount? Decimal, amount Decimal, currency 'SOS', dueDate, status
PENDING|PART_PAID|PAID|CANCELLED, paidAmount Decimal default 0, createdById, notes?),
`Payment` (id, controlNumber, assessmentId?, billId? — bill FK added in phase 3, payerId,
channel CASH|BANK|MOBILE_MONEY|BULK, channelTxnRef?, amount, currency, fxRate Decimal(18,6),
fxRateAt?, localAmount, status INITIATED|PENDING|CONFIRMED|FAILED|PERMANENTLY_FAILED|REVERSED,
statusCheckAttempts int, paidAt?, capturedById?, callbackPayload? json, failureReason?,
@@unique([channel, channelTxnRef])), `Reversal` (paymentId, reason, capturedById, status
PENDING_APPROVAL|APPROVED|REJECTED, approvedById?, decidedAt?, decisionNote?), `BulkUpload`
(id, kind REVENUE_TRANSACTIONS|METER_READINGS, fileName, storedPath, totalRows, accepted,
rejected, summary json, uploadedById, createdAt). Add `User.payerId?` FK.
Register these models in `audit.config.ts`.

## Backend
1. **Payers**: `POST /payers` (generates TIN per D10), `GET /payers` (search by name/TIN/
   phone, type, status, pagination), `GET /payers/:id` 360° view `{ payer, assessments
   (summary), waterAccounts: [] (phase 3 fills), payments (last 20), balances: {
   assessedTotal, paidTotal, outstanding } }`, `PATCH /payers/:id`, suspend/reactivate.
   **Duplicate detection** on create/update: exact match on normalised phone (E.164, strip
   spaces), lower-cased email, nationalId → create `DuplicateFlag` rows (both directions
   deduped) and return them in the create response with `warnings`. `GET /payers/duplicates`
   queue + `POST /payers/duplicates/:id/review { status, note }` (`payers.review_duplicates`).
2. **Revenue types** CRUD (`revenue_types.manage`), deactivate instead of delete when used.
3. **Assessments**: `POST /assessments { payerId, revenueTypeId, baseAmount?, period?,
   dueDate }` — amount = FIXED rate or `baseAmount × rate%`; control number from the shared
   generator (D10) in the same transaction; `GET /assessments` with **advanced filters**:
   `payerId|tin, revenueTypeId, amountMin, amountMax, status, dateFrom, dateTo (createdAt),
   dueFrom, dueTo, controlNumber`, sort, pagination, plus `GET /assessments/export.csv` with
   the same filters. `GET /assessments/:id` includes payments. `POST /assessments/:id/cancel`
   (only if unpaid).
4. **Manual payment capture** (`payments.capture`): `POST /payments/capture { controlNumber,
   amount, currency, channel CASH|BANK|MOBILE_MONEY, channelTxnRef?, paidAt }` → resolves
   assessment (bill support added in phase 3), applies amount (`paidAmount`, status
   PART_PAID/PAID, reject over-payment > outstanding with `OVERPAYMENT`), status
   CONFIRMED immediately. `GET /payments` with filters: `payerId, revenueTypeId (via
   assessment), amountMin/Max, channel, status, currency, dateFrom/To`.
5. **Bulk uploader** (`bulk_uploads.create`): `POST /bulk-uploads/revenue-transactions`
   (multipart CSV, `?dryRun=true` supported) using the shared `common/csv` pipeline (D12).
   Template columns: `control_number, amount, currency, channel, channel_txn_ref, paid_at,
   captured_by_email?`. Row validation: schema (zod), control number check digit, assessment
   exists and not CANCELLED/PAID, currency ∈ {SOS, USD} (USD rows converted using the latest
   stored FX rate — add a tiny `FxRate` table now with a seed row; phase 4 keeps it fresh),
   amount > 0 and ≤ outstanding, duplicate `channel_txn_ref` within file or in DB. Accepted
   rows become CONFIRMED payments with `channel = BULK`-tagged source (store original
   channel in `channel`, mark `bulkUploadId`). Response per D12; `GET /bulk-uploads`,
   `GET /bulk-uploads/:id` (summary + rejected rows), `GET /bulk-uploads/template.csv`.
6. **Reversals**: `POST /reversals { paymentId, reason }` (`reversals.capture`) →
   PENDING_APPROVAL; `POST /reversals/:id/approve|reject` (`reversals.approve`) — **SoD**:
   `capturedById === approverId` → 403 `SOD_VIOLATION` even if the user somehow holds
   both permissions. Approve → payment `REVERSED`, assessment `paidAmount` reduced and
   status recomputed, audit rows record before/after. `GET /reversals` queue with filters.
   (Phase 5 hooks FMIS reversal batches onto approve.)
7. **Seed**: 6 revenue types (BUSINESS_LICENCE fixed, PROPERTY_RATE percent, MARKET_FEE
   fixed, VEHICLE_LICENCE fixed, SIGNAGE_FEE fixed, WATER fixed 0 — used as the GL carrier
   for water), ~200 payers (5 deliberate duplicates by phone/email), ~1,500 assessments over
   the last 12 months, ~900 CONFIRMED payments (mix of channels, 15 % USD), 10 reversals in
   mixed states, one FX rate row. Link `customer1@ircub.test` to a payer with data.
   Add `docs/samples/revenue-transactions.sample.csv` (20 rows, 4 deliberately invalid).

## Frontend
- Payers: list with search, register form (shows duplicate warnings after save), profile
  page with tabs (Assessments / Water accounts (empty for now) / Payments / Balance) and
  summary cards; Duplicates review queue.
- Revenue types admin page.
- Assessments: create form (live amount preview), list with **FilterBar** (all filters),
  CSV export button, detail drawer with payments.
- Payments: capture form (control number lookup shows payer + outstanding), list with
  filters.
- Bulk upload page: drop CSV → dry-run preview table (row, status, reason) → confirm →
  summary (totals + rejected rows table, downloadable). Reusable `CsvUploader` component.
- Reversals: capture from payment row; approval queue for supervisors; SoD error surfaced
  as a clear notification.
- Customer portal `/me`: my assessments and payments (read-only; pay comes in phase 4).

## Tests (minimum)
Unit: TIN and control number generate/validate (incl. bad check digit), FIXED vs PERCENT
amount, payment application (part/paid/overpayment), duplicate detection normalisation,
CSV pipeline row validation (each rejection reason), reversal SoD. E2E: register payer →
duplicate flag created; create assessment → control number valid; bulk upload sample →
summary has 16 accepted / 4 rejected with reasons; capturer cannot approve own reversal.

Commits: `feat(api): payer registry with tin and duplicate detection` · `feat(api): revenue types and assessments with control numbers` ·
`feat(api): manual payment capture and advanced filters` · `feat(api): shared csv import pipeline and bulk revenue uploader` ·
`feat(api): reversals with segregation of duties` · `feat(api): seed payers, assessments, payments` ·
`feat(web): registry, assessments, payments, bulk upload, reversals` · `test(api): registry and revenue rules` · `docs: phase 2 progress`
