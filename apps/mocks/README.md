# apps/mocks

Simulated external systems (FX, bank, mobile money, FMIS, SMS/email). In-memory state only;
`POST /__reset` clears it. See `CLAUDE.md` here for the endpoint contract and scenario triggers.

```bash
pnpm --filter mocks dev      # :3100, Swagger at /docs
pnpm --filter mocks test     # unit tests (drift, HMAC, idempotency, perturbation)
curl 'localhost:3100/rates?base=USD'
```
