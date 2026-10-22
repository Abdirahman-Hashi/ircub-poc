# audit

**Purpose.** Read-only API over the tamper-evident audit log (brief Module 3.4, D8).
Rows are written by the Prisma extension in `common/audit`, never by this module.

**Rules.**

- `hash = sha256(prevHash || canonicalJson(row))`, rows chained through a single
  `audit_chain_head` row locked `FOR UPDATE` so writers serialise. Genesis prevHash is 64 zeros.
- Audited models and redacted fields are declared in `common/audit/audit.config.ts`; add a
  model there in the same commit as its Prisma model.
- The table has an append-only trigger; the production grant (INSERT + SELECT only) is in the
  migration as documentation.
- `createMany` rows get their uuid assigned by the extension before the insert (Prisma only
  returns a count), so each audit row names the real entity.
- `GET /audit/verify` recomputes every hash from genesis **and** compares the last row with
  `audit_chain_head`: deleting the newest rows is reported as a break at `headSeq`.
- Known trade-off: audit rows are written in their own transaction right after the mutation;
  a rolled-back interactive transaction leaves its audit rows behind.

**Endpoints.**

- `GET /audit?entity&entityId&actorId&from&to&page&pageSize&sort` — `audit.view`
- `GET /audit/verify` — `audit.view` — `{ ok, checked, firstBrokenSeq?, headSeq? }`

**Web.** `features/audit/AuditPage.tsx`: filters (entity, entity id, actor, dates), field-level
before/after diff per row (`audit.rules.ts#diffSnapshots`) and the "Verify chain" button.

**Testing.** Unit: `common/audit/audit.rules.spec.ts` (canonical JSON, hash, tamper detection),
`audit.service.spec.ts` (intact chain, truncated tail, tampered row).
E2E: `test/audit.e2e-spec.ts` (mutations produce chained rows; verify ok).
