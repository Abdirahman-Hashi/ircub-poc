# self

**Purpose.** Customer portal API: a Taxpayer/Customer user sees only the payer record linked
to their account (brief Module 1; standards §5 ownership scope).

**Rules.** `User.payerId` is the scope; the permission `self.view` alone is not enough.
Paying from the portal arrives with the online channels in phase 4 (`self.pay`).

**Endpoints.** `GET /me` — `self.view` — the same 360° profile revenue staff see for that payer.

**Testing.** E2E: `test/registry.e2e-spec.ts` (customer1 sees their linked payer; an unlinked
user gets 404).
