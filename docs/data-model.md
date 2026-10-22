# Data model

The ERD (`docs/erd.md`, rendered as `docs/erd.svg`) is generated from
`apps/api/prisma/schema.prisma`. This page explains it: one paragraph per bounded context and
the invariants the database itself enforces. Money is `Decimal(18,2)`, FX rates
`Decimal(18,6)`, dates are `timestamptz` (business days are UTC dates), ids are UUIDs, and
nothing is soft-deleted: status fields carry lifecycle.

## Identity and access

`User` (argon2 password hash, optional TOTP secret, lockout counters, optional link to a
`Payer` for the customer portal), `PasswordHistory`, `RefreshToken` (hashed, rotated,
reuse-detected). Permissions are rows (`Permission`, `resource.action` codes seeded from
`packages/shared`), granted to `Role`s through `RolePermission`; `Role.parentId` builds the
hierarchy a user's effective permission set is resolved through at request time. `SodRule`
holds the configurable segregation-of-duties pairs. Invariants: `User.email`, `Role.code`
and `Permission.code` are unique; `(permissionACode, permissionBCode)` is unique so a rule
exists once; the per-record rule "capturer ≠ approver" lives in the reversal service and is
tested separately.

## Audit

`AuditLog` is append-only (a trigger blocks UPDATE/DELETE): actor, entity, entity id, action,
`before`/`after` JSON, IP, user agent, `prevHash` and `hash`. `AuditChainHead` is a single
row locked `FOR UPDATE` by every writer, which serialises appends and makes `seq` and the hash
chain consistent under concurrency. `GET /audit/verify` recomputes every hash from genesis and
compares the tail with the head, so edits, deletions in the middle and truncation of the
newest rows are all detected.

## Registry and revenue

`Payer` (unique `TIN` with a check digit; indexed phone, email and national id for duplicate
detection), `DuplicateFlag` (unique per pair and field, reviewed to CONFIRMED/DISMISSED),
`RevenueType` (unique code, FIXED or PERCENT rate, default GL code), `Assessment` (unique
`controlNumber`, amount, `paidAmount`, status), `Payment` (channel, original amount and
currency, FX rate, local amount, status, channel reference, callback payload),
`Reversal` (captured by, decided by, decision note) and `BulkUpload` (summary with per-row
rejections). Invariants: `Assessment.controlNumber` unique; `(channel, channelTxnRef)` unique
so a replayed channel reference can never create a second payment; `ControlNumber` is the
shared sequence behind assessment and bill numbers.

## Water billing

`TariffCategory` with contiguous `TariffTier` bands (`(categoryId, fromUnit)` unique),
`WaterAccount` (unique account number, payer, tariff), `Meter` (unique serial, dial size,
replacement chain through `replacesMeterId`), `MeterReading` (`(meterId, readingDate)` unique,
consumption, abnormal flag with reason), `BillingCycle` (unique period, status, exception
report in `stats`), `Bill` (unique `billNumber` = control number, tier breakdown, own charges,
arrears, total due, paid amount, flag and held state) and `Notification` (SMS/e-mail rows
produced on release). Invariant worth knowing: a bill's `totalDue` includes the arrears of
earlier bills, so every balance in the system is computed as Σ own charges − Σ payments over
released bills (`billing.rules.ts`), never as Σ `totalDue`.

## Channels and FX

`FxRate` keeps every quote (base, quote, rate, asOf, source) so conversions are reproducible.
`ChannelStatement` and `ChannelStatementLine` store the statement file a channel produced for
a day; `ReconciliationRun` and `ReconciliationLine` record the comparison (MATCHED,
AMOUNT_MISMATCH, MISSING_IN_IRCUB, MISSING_IN_CHANNEL) with links back to the payment and the
statement line.

## FMIS

`GlMapping` is effective-dated per revenue type (`(revenueTypeId, effectiveFrom)` unique).
`JournalBatch` (date, COLLECTIONS or REVERSAL, PENDING → POSTED/FAILED → REVERSED, FMIS
reference, attempts, last error) holds `JournalLine`s. Invariants that make posting
idempotent: `JournalLine.paymentId` is unique (a payment is journaled once), `JournalLine.
reversalId` is unique, and the partial unique index `journal_batch_collections_date_key`
allows one COLLECTIONS batch per day. The FMIS mock is itself idempotent on `batchId`.

## Dashboard

`DailyCollectionSummary` (`(date, revenueTypeId, channel)` unique; totals and counts,
reversed totals and counts) and `DailyBillingSummary` (date unique; billed and collected) are
rebuilt from the source tables and are the only thing the dashboard reads. `RevenueTarget` is
unique per `(period, revenueTypeId)`. `Alert` carries a `dedupeKey`; the partial unique index
`alert_open_dedupe_key` guarantees one open alert per type and key.

## Configuration

`SystemConfig` holds the runtime-tunable business parameters as typed keys with seeded
defaults (password policy, abnormal-consumption threshold, retry limits, cash GL code, local
currency, anomaly thresholds, FMIS catch-up window). Deployment values live in the
environment; fixed domain constants in `*.constants.ts`.
