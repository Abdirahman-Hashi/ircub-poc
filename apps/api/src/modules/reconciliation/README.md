# reconciliation

**Purpose.** Daily two-way reconciliation between IRCUB's confirmed online payments and the
channel's settlement statement (brief Module 5.3; D16).

**Rules.**

- A run is per channel and UTC business day. The statement is stored verbatim under
  `STORAGE_DIR/statements/<id>.csv` plus one `ChannelStatementLine` per row, so a run can be
  audited and re-read later.
- Matching is on `channelTxnRef` only; amounts are compared in the original currency
  (`classify` in `reconciliation.rules.ts`). Each line is `MATCHED`, `AMOUNT_MISMATCH`,
  `MISSING_IN_CHANNEL` (IRCUB has it, statement does not) or `MISSING_IN_IRCUB`.
- Only `CONFIRMED` and `REVERSED` payments with `paidAt` on the day take part; pending or
  failed payments are not expected on a statement.
- A statement that cannot be fetched produces a `FAILED` run with the error rather than
  nothing, so the daily history has no gaps.
- `0 1 * * *` cron reconciles yesterday for every online channel.

**Endpoints.** `POST /reconciliation/runs { channel, date, perturb? }` (`reconciliation.run`),
`GET /reconciliation/runs`, `GET /reconciliation/runs/:id?status=`,
`GET /reconciliation/runs/:id/export.csv`, `GET /reconciliation/statements`
(`reconciliation.view`), `POST /reconciliation/statements` multipart `{ file, channel, date }`.

**Testing.** Unit: `reconciliation.rules.spec.ts` (four statuses, numeric compare, day
helpers). E2E: `test/channels.e2e-spec.ts` runs a perturbed statement and expects 1/1/1.
