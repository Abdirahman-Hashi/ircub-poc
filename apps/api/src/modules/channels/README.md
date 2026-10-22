# channels

**Purpose.** The `ChannelClient` interface (initiate, status, statement) and its HTTP
implementations for the bank and mobile-money mocks (brief Module 5, D15, D16; standards §3).

**Rules.**

- One client per `PaymentChannel`, built from `MOCKS_BASE_URL` + `/bank` or `/momo`;
  10 s timeout; any network error or non-2xx → `CHANNEL_UNAVAILABLE` (503). Cash and bulk
  are not online channels → `CHANNEL_NOT_SUPPORTED`.
- Callback signatures are verified with constant-time HMAC-SHA256 over the raw body
  (`channels.rules.ts`), shared secret `MOCK_SHARED_SECRET`.
- Tests inject fakes through the `CHANNEL_CLIENTS` token.

**Endpoints.** None; used by `payments` and `reconciliation`.

**Testing.** Unit: `channels.rules.spec.ts` (valid/tampered/wrong-secret signatures, statement
parsing). E2E: `test/channels.e2e-spec.ts` against an in-process mocks app.
