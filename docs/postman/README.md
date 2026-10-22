# Postman collection

`IRCUB.postman_collection.json` is generated from `docs/openapi.json` by
`pnpm postman:export` (`openapi-to-postmanv2`, D22); do not edit it by hand. Requests are
grouped by API tag and carry example bodies from the Swagger decorators.

## Import and run

1. Postman → Import → drop both JSON files from this folder.
2. Select the **IRCUB local** environment (`baseUrl` = `http://localhost:3000`; change it to
   the hosted API URL to hit the Render demo).
3. Send any request. The collection's **pre-request script** logs in as the seeded
   administrator (`adminEmail` / `adminPassword` from the environment) the first time and
   stores the JWT in `accessToken`; every request uses it as a bearer token.
4. To act as another seeded user (e.g. `officer@ircub.test`), change `adminEmail` and clear
   `accessToken`; the next request logs in again. Access tokens live 15 minutes: clear
   `accessToken` to refresh.

## Useful sequences

- **Register → assess → pay:** `POST /payers` → `POST /assessments` → `POST /payments/capture`
  (control number from the assessment) → `GET /payments/{id}` → `GET /audit?entity=Payment`.
- **Online payment with a mock callback:** `POST /payments/initiate` with amount `12.00`
  (confirmed by callback), `.77` (confirmed by the status-check job), `.66` (permanently
  failed after three checks) → `GET /payments/{id}`.
- **FMIS:** `POST /fmis/batches/build` for yesterday → `GET /fmis/batches/{id}` →
  `GET /fmis/reconciliation?from&to`.
- **Audit integrity:** `GET /audit/verify` → `{ ok: true, checked, headSeq }`.

The Swagger UI at `{{baseUrl}}/docs` offers the same operations interactively (Authorize with
the bearer token from `POST /auth/login`).
