# Assumptions

Append one bullet per assumption as it is made. Format: *We assume X because Y; if wrong, Z changes.*
Phase 7 copies this list into the README.

## Domain
- We assume the local currency is the Somali Shilling (SOS) because the case study is a
  Federal Member State; it is a single config value, so changing it affects only seed data
  and labels.
- We assume "revenue transactions" in the bulk uploader are **collections/payments** captured
  outside the online channels (cashier, bank branch, agent) referencing an existing control
  number, because that is the only interpretation that needs validation against existing
  records; if assessments are meant instead, the same CSV pipeline accepts a second template.
- We assume assessments and water bills are denominated in SOS and USD payments are converted
  at the retrieved rate at capture time; if bills can be denominated in USD, `Bill.currency`
  is already present and the conversion flips direction.
- We assume one billing cycle per calendar month per tariff category, run manually by a Water
  Billing Officer (not auto-scheduled), because the brief says "run a monthly billing cycle".
- We assume water revenue is itself a revenue type (code `WATER`) with its own GL code so FMIS
  posting treats water collections like any other revenue.
- We assume "3-month average" for abnormal consumption means the mean of the three most
  recent monthly consumption figures for the same meter, excluding the current one.
- We assume revenue targets are set per month per revenue type by the Ministry (seeded), and
  "collection efficiency" = billed vs collected for water, collected vs target for tax.
- We assume the channel statement file is a CSV with columns `txn_ref, date, amount,
  currency, control_number, status`, produced by the mock channel; a real bank's format would
  only change the parser.
- We assume the FMIS accepts a JSON journal batch `{ batchId, date, lines: [{ glCode, debit,
  credit, currency, reference }] }` and returns `{ fmisReference }`; it is a mock.

- We assume a TIN check digit of "10" is simply not issued (the body is regenerated) because
  the brief asks for a single check digit; if an alphabetic check character (ISBN-style `X`)
  is preferred, only `ids.rules.ts` changes.
- We assume phone numbers without a country code are local Somali numbers (`+252`) because
  the case study is a Federal Member State; the code is a `SystemConfig` value.
- We assume a bulk-upload row that would over-pay an assessment is rejected rather than
  capped, because partial acceptance of a row would silently change the uploader's intent.
- We assume a bulk file keeps each row's real channel (cash/bank/mobile money) and is
  identified by `bulkUploadId`, because channel reconciliation (phase 4) matches on the
  channel's own reference; if "BULK" must be the channel, it is one constant change.

- We assume water payments always quote a bill's control number, so "unallocated payments"
  do not exist and arrears are simply the unpaid remainder of earlier released bills; if
  account-level prepayments are needed, `Bill.paymentsApplied` is the field to fill.
- We assume one bill per account per calendar month covering every reading in the month
  (consumption summed, previous reading = last reading before the month); if a utility wants
  bills per reading, the cycle loop changes, not the tariff rules.
- We assume a reading can be flagged only against the current meter and its direct predecessor,
  because older generations have different dials; if a longer chain is wanted, the lookup
  follows `replacesMeterId` recursively.

- We assume the local amount of an online payment is fixed at initiation (converted at the
  rate in force then) because the payer agrees to that amount; a callback that reports a
  different amount or currency is recorded as FAILED with reason `AMOUNT_MISMATCH` rather than
  re-applied. If the Ministry wants the settled amount to win, the settlement service would
  re-convert on confirmation.
- We assume a confirmed channel payment whose ledger target can no longer accept it (for
  example settled by cash while the channel was pending) is recorded FAILED with the ledger's
  reason for a supervisor to resolve, because the money has already left the payer and
  silently dropping it would hide a credit; a production system would create an unallocated
  credit instead.
- We assume "retry up to 3 times" means three status checks in total (configurable as
  `PAYMENT_STATUS_RETRY_LIMIT`), spaced by exponential backoff from
  `PAYMENT_STATUS_RETRY_DELAY_SECONDS`, and that the first check waits
  `PAYMENT_STATUS_CHECK_DELAY_SECONDS` for the callback; if the brief meant three retries after
  a first attempt, only the limit default changes.
- We assume channel reconciliation matches on the channel's transaction reference only and
  compares amounts in the original currency (what the channel settled), with `CONFIRMED` and
  `REVERSED` payments of that UTC day on the IRCUB side; if the channel's statement day were
  defined differently (value date), the `paidAt` window in `ReconciliationService` changes.
- We assume a failed statement fetch produces a `FAILED` reconciliation run rather than no
  run, so the daily history has no silent gaps.
- We assume the supervisor escalation for permanently failed payments is an e-mail to every
  user holding `payments.supervise` plus an in-app bell fed by SSE, and that the Alert record
  arrives in phase 6 as the prompt says.
- We assume the mocks keep channel state in memory, so the seed re-registers the last 60 days
  of confirmed online payments with the mocks on every run when they are reachable; when the
  mocks are down the seed logs it and the statements only know payments made live.

## Security
- We assume the role-level SoD rule (`reversals.capture` ⟂ `reversals.approve`) applies to every
  user including System Administrators, because a superuser exemption would defeat the control;
  if administrators must be able to do both, remove the seeded rule rather than add a bypass.
- We assume Revenue Officers capture reversal requests and Revenue Supervisors approve them
  (brief: "View/Approve/Reverse"), so Supervisor cannot inherit Officer without breaking the
  SoD rule; the seeded hierarchy is therefore Water Billing Officer → Revenue Officer. If the
  Ministry wants Supervisor ⊇ Officer, `reversals.capture` must move to a role outside that chain.
- We assume the System Administrator holds every permission except `reversals.capture`
  (brief lists only user/role/config management for admins; the extra permissions make the
  demo navigable). If a reviewer wants a pure admin role, trim `ROLE_SEEDS`.
- We assume an audit row written immediately after its mutation (not in the same transaction)
  is acceptable for the POC; a production deployment would use a transactional outbox.
- We assume 2FA is optional and user-enrolled (TOTP authenticator app), because the brief says
  "optional two-factor authentication".
- We assume the Auditor role is view-only on *everything* including configuration screens.
- We assume a Taxpayer/Customer user is linked to exactly one Payer (`User.payerId`) and sees
  only that payer's data.

## Security (phase 4)
- We assume the shared HMAC secret with the channels (`MOCK_SHARED_SECRET`) stands in for the
  per-channel credentials a real bank or mobile-money provider would issue; the callback is
  the only unauthenticated business endpoint and is throttled separately.
- We assume passing the short-lived access token as a query parameter to the SSE endpoint is
  acceptable because `EventSource` cannot send headers and the token lives 15 minutes; a
  production deployment would use a one-time stream ticket.

## Operations
- We assume the business "day" for jobs, summaries and reconciliation is the UTC calendar date
  because all services run in one timezone-agnostic container set; if the Ministry needs
  local-time days, the date helpers in `common/` take a timezone parameter.
- We assume one API process at a time (pg-boss workers, the in-process SSE event bus, and the
  30 s SystemConfig cache are all single-instance) because the POC deploys one container; if
  horizontally scaled, the event bus would move to Postgres LISTEN/NOTIFY and the cache would
  shrink or move to the database.
- We assume Node 22 LTS (not 20, which is end-of-life) and NestJS 11 / Prisma 6 satisfy the
  brief's "modern stack" expectation; if a reviewer requires the exact majors in the phase
  prompt, only `.nvmrc`, the Dockerfiles and a handful of config imports change.
- We assume the hosted demo may cold-start (~1 min) because it runs on free tiers; Docker
  Compose is the primary evaluation path.
- We assume scheduled jobs only need to run while the API is up (no external scheduler).
