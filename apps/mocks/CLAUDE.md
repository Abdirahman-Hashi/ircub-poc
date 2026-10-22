# apps/mocks — simulated external systems

Root `CLAUDE.md` and `docs/DECISIONS.md` apply. This app stands in for every external
system in the brief. It must be deterministic enough to demo and controllable enough to
test failure paths. In-memory state only (reset on restart), plus a `POST /__reset`.

Port 3100. All endpoints JSON unless noted. Swagger at `/docs`.

## Endpoints
| System | Endpoint | Behaviour |
|---|---|---|
| FX | `GET /rates?base=USD` | `{ base, rates: { USD: 1, SOS: 571.5 ± drift }, asOf }`. Rate drifts slightly per call (±0.5 %) so "dynamic" is visible. `?fail=1` → 503. |
| Bank | `POST /bank/payments` `{ amount, currency, controlNumber, callbackUrl, clientRef? }` | Returns `{ txnRef: 'BNK-…', status: 'PENDING' }`. After `MOCK_CALLBACK_DELAY_MS` (default 3000) POSTs a signed callback to `callbackUrl`: `{ txnRef, status: 'SUCCESS'|'FAILED', amount, currency, controlNumber, paidAt, clientRef? }` with header `X-Signature: hmac-sha256(body, MOCK_SHARED_SECRET)`. `clientRef` is echoed verbatim (callback and status) so the caller can match a payment whose initiation reply was lost. |
| Bank | `GET /bank/payments/:txnRef` | Status check. Honour scenario flags (below). |
| Bank | `GET /bank/statements?date=YYYY-MM-DD` (text/csv) | Statement of that day's SUCCESS payments, with deliberate perturbations when `?perturb=1`: one missing line, one extra line, one amount off by 0.01. |
| Mobile money | `POST /momo/payments`, `GET /momo/payments/:txnRef`, `GET /momo/statements` | Same contract as bank, prefix `MM-`. |
| FMIS | `POST /fmis/journals` `{ batchId, date, lines[] }` | Idempotent on `batchId`: returns the same `{ fmisReference, status: 'POSTED' }` on repeat. Validates lines balance (sum debit = sum credit) → 422 otherwise. `?fail=1` or batch `date` ending in `13` → 500 (for retry demo). |
| FMIS | `GET /fmis/ledger?date=YYYY-MM-DD` | Totals per GL code from posted batches (used by FMIS reconciliation). |
| Notifications | `POST /sms`, `POST /email` | Store `{ to, body/subject, sentAt }` → 202. |
| Notifications | `GET /outbox` | Everything "sent", newest first (demo page links here). |
| Control | `POST /__reset`, `POST /__scenario { txnRef, outcome: 'SUCCESS'|'FAILED'|'TIMEOUT'|'NO_CALLBACK' }` | Force outcomes for tests: `TIMEOUT` makes status checks hang 10 s; `NO_CALLBACK` suppresses the callback so the API's retry path runs. |

## Scenario triggers without control endpoint (for demos)
- Amount ending in `.99` → payment FAILED.
- Amount ending in `.77` → no callback (forces API status-check retries, which return PENDING
  twice then SUCCESS).
- Amount ending in `.66` → no callback and status check always 500 (forces PERMANENTLY_FAILED).

## Rules
- `docs/ENGINEERING-STANDARDS.md` applies here too: scenario trigger suffixes, prefixes
  (`BNK-`, `MM-`), drift %, delays and the base FX rate are named constants in
  `mocks.constants.ts` or env; request/response shapes are DTOs in `dto/`; in-memory
  store types in `store.types.ts`.
- Log every inbound request and every outbound callback (method, path, key ids).
- Shared secret and delays from env (`MOCK_SHARED_SECRET`, `MOCK_CALLBACK_DELAY_MS`).
- Keep it small: one controller per system, one in-memory store service, no database.
- Unit tests: HMAC signing, FMIS idempotency, statement perturbation, scenario triggers.
