# bulk-uploads

**Purpose.** Bulk CSV import of revenue transactions with per-row validation (brief Module 3.3
"bulk uploader with real-time validation", D12). Meter readings reuse the pipeline in phase 3.

**Rules.**

- Template: `control_number, amount, currency, channel, channel_txn_ref, paid_at[, captured_by_email]`.
- Per row, in order: schema (zod) → control-number check digits → assessment exists and is
  payable → amount > 0 → reference required for non-cash → reference unique in file and in the
  database → capturer exists → FX rate available → amount ≤ outstanding _after earlier rows in
  the same file_. The first failure is reported with line, field and reason.
- Valid rows are persisted in one transaction through `PaymentsService.recordConfirmedPayment`
  (same path as manual capture); invalid rows are rejected individually. `?dryRun=true` runs
  everything but persists nothing (the UI's preview step).
- The uploaded file is stored under `STORAGE_DIR/uploads/<uploadId>.csv` and the summary on
  the `BulkUpload` row for the audit trail. Row cap: `SystemConfigKey.CSV_MAX_ROWS`; size cap
  `CSV_IMPORT.MAX_FILE_BYTES`.

**Endpoints** (`bulk_uploads.create`): `GET /bulk-uploads/template.csv`,
`POST /bulk-uploads/revenue-transactions?dryRun` (multipart `file`), `GET /bulk-uploads`,
`GET /bulk-uploads/:id`.

**Testing.** Unit: `common/csv/csv.rules.spec.ts`, `bulk-uploads.rules.spec.ts`. E2E:
`test/bulk-upload.e2e-spec.ts` uploads `docs/samples/revenue-transactions.sample.csv` → 16
accepted / 4 rejected with reasons.
