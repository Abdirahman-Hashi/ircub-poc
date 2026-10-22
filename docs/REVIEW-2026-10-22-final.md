# Final self-review against the brief — 2026-10-22 (after phase 7)

Second assessor pass, run after the fix pass and phase 7, at tag `v0.1.0-poc` (commit
`2bedbf1`). Evidence was re-taken from the code, the schema, the tests, the git history and
the generated artefacts; the first pass (`docs/REVIEW-2026-10-22.md`) is referenced only to
confirm that its findings are closed. Paths are repository-relative.

**Gates at the time of review**

| Gate | Result |
| --- | --- |
| `pnpm lint` (`eslint . --max-warnings 0`) | clean |
| `pnpm typecheck`, `pnpm format:check` | clean |
| API unit | 30 suites, 174 tests |
| API e2e (throwaway Postgres) | 11 suites, 64 tests |
| Mocks unit · Web unit | 13 · 23 |
| API line coverage, unit + e2e merged | 93.2 % lines, 68.1 % branches, 87.1 % functions |
| Compose from a fresh project | migrated, seeded on first boot, callback crossed containers, audit verify ok |
| CI (run 39781349775) | success: lint/typecheck/tests + three Docker builds |

**Headline.** Every requirement of the seven modules is implemented, tested and reachable
from a screen. All P0 and P1 findings of the first review are closed in code (verified
below by an independent read). The pass surfaced two residuals in the arrears area (the
dashboard's billed totals still summed `totalDue`; an older unpaid bill stayed payable after
a newer bill carried its balance) and two documentation defects in the README; all four were
fixed in the follow-up commits recorded at the end of this file. What remains is the hosted
URL, which needs the candidate's Render and Neon accounts. Nothing would fail the assessment.

---

## 1. Requirements walk

Only the status and the evidence that changed since the first review are repeated in full;
unchanged rows carry the same evidence as `docs/REVIEW-2026-10-22.md` §1.

| Requirement | Status | Evidence | Gap / risk |
| --- | --- | --- | --- |
| 1.1 Six hierarchical roles, permissions configurable in the DB | DONE | unchanged (`roles.seed.ts`, `PUT /roles/:id/permissions`, per-request resolution) | web menus refresh on reload |
| 1.2 Custom roles, segregation of duties | DONE | `assertNoConflict` now runs under the user's/role's row lock inside the write transaction: `users.service.ts` `setRoles`, `roles.service.ts` `setPermissions`/`update`; per-record rule re-checked under `SELECT … FOR UPDATE` in `reversals.service.ts` approve/reject; deterministic e2e `revenue.e2e-spec.ts` "SoD on reversals" (rule lifted, capturer granted approve, `SOD_VIOLATION`, restored) | — |
| Output 1: login, policy, optional 2FA, role-based menus | DONE | MFA e2e added: enrol → wrong code 401 → confirm → challenge login → wrong code → verify → disable (`auth.e2e-spec.ts`) | TOTP secret still plaintext at rest (P2, documented in README security notes) |
| 2.1–2.3 TIN, relations, duplicates with review | DONE | unchanged | duplicate confirmation is a status only (documented) |
| Output 2: 360° profile | DONE | balances now use `accountOutstanding` (`payers.service.ts` bill aggregate on own charges) | — |
| 3.1 Revenue types with rates and GL codes | DONE | `revenue-types.e2e-spec.ts` (CRUD, 403 for officers, delete vs deactivate for assessment- and mapping-referenced types); `remove` counts every relation via `_count` | — |
| 3.2 Assessments with unique control number | DONE | unchanged | — |
| 3.3 Bulk uploader | DONE | prefetch from header-keyed records (`csv-import.service.ts` → `createContext(records)`, `bulk-uploads.service.ts` `BULK_COLUMN` keys); `validateRevenueRow` in `bulk-uploads.rules.ts` with a unit test per reason; imports mark summary days dirty | "streaming" remains buffer-then-parse (P2) |
| 3.4 Tamper-evident audit, web screen | DONE | `features/audit/AuditPage.tsx` routed at `ROUTES.AUDIT` (filters, field diff, Verify chain); `audit.extension.ts` assigns `createMany` ids; `ChannelStatementLine`/`ReconciliationLine` audited; `verify` compares the tail with `AuditChainHead` (`audit.service.spec.ts`: intact, truncated, tampered) | audit rows still written after the mutation (documented) |
| 3.5 Advanced filters | DONE | unchanged | no payments CSV export (P2) |
| 4.1 Readings; below-previous rejected unless rollover/replacement | DONE | ROLLOVER bounded (`readings.rules.ts`, `READING_INVALID_ROLLOVER`, e2e); replacement records an optional closing reading in the same transaction | — |
| 4.2 Cycle: tiered tariff, arrears, payments applied | DONE | arrears = Σ own charges − Σ payments over released bills (`billing.rules.ts#accountOutstanding`), used by the cycle, the account view, the payer balance, the dashboard and the statement; `billing.rules.spec.ts` three-cycle case asserts 5000 | — |
| 4.3 PDF + mock SMS/e-mail | DONE | unchanged | notification job not idempotent on retry (P2) |
| 4.4 Abnormal > 200 % blocks release; exception report | DONE | confirmed flags are held (`stats.held`), cycle releases without them, a held bill releases on clear (`water-billing.e2e-spec.ts`) | — |
| Output 4: statement with running balance | DONE | bills debited at own charges (`statements.rules.ts`), spec "does not count arrears twice" | no statement PDF under `/me` (P2) |
| 5.1 Mock channels, dynamic FX, initiate → callback → verify → update | DONE | late SUCCESS applied, repeat FAILED duplicate (`settlement.rules.ts`); `clientRef` sent at initiation and echoed by the mocks so a lost reply is matched (`payment-settlement.service.ts#adoptReference`, `payment-settlement.service.spec.ts`); FX refresh period from `FX_REFRESH_MINUTES` | — |
| 5.2 Retry ×3 → permanently failed → supervisor notified | DONE | `markPermanentlyFailed` under the row lock, PENDING only; alert raise asserted in the unit spec; e2e polls the escalation e-mails | — |
| 5.3 Daily channel reconciliation | DONE | unchanged | duplicate `txnRef`s in a statement collapse (P2) |
| 6.1 Configurable GL mapping | DONE | unchanged | — |
| 6.2 Daily batches, four statuses | DONE | catch-up window `FMIS_CATCH_UP_DAYS` (`eligibilityWindowStart`, `catchUp` on build and build-range, seed without), e2e "a later build sweeps payments confirmed after their own day was batched" | journal date = batch date for late payments (documented) |
| 6.3 Post to FMIS, reference stored, never twice | DONE | lines denominated in `LOCAL_CURRENCY`; uniqueness unchanged | — |
| 6.4 Reconciliation screen with drill-down | DONE | unchanged | 60 s ledger cache not invalidated after a post (P2) |
| 7.1 Trends, targets, efficiency, forecast, real-time alerts | DONE | alert dedupe enforced by `alert_open_dedupe_key` (migration `20261022113000`); `alerts.service.spec.ts` unique-violation case | — |
| 7.2 Server-side, pre-aggregated, async | DONE | transactional rebuild (`summary.service.ts`), bulk uploads mark days dirty, `Cache-Control` on all five read endpoints | trends query has no `refetchInterval` (P2) |
| Deliverable: Git history | DONE | 105 Conventional Commits, phases visible, tag `v0.1.0-poc` at HEAD, no tracked junk | 4 author identities for one person (P2, `.mailmap`) |
| Deliverable: README | PARTIAL | all required sections present with content; screenshots ×8; stack with justifications; Mermaid architecture; walkthrough table; AI declaration | **copied assumptions keep `##` headings** (`## Domain`, `## Security`, `## Security (phase 4)`, `## Operations` under an empty `## Assumptions`); missing the "crons run only while awake, open the URL to wake" sentence |
| Deliverable: ERD + seed | DONE | `docs/erd.md` (39 entities, 41 relations), `docs/erd.svg`, `docs/data-model.md`; seed deterministic, idempotent, `--if-empty` on container boot | ERD is a hand-rolled parser instead of `prisma-erd-generator` (D23 note) |
| Deliverable: OpenAPI + Postman | DONE | 136 operations, every one with the `default` error envelope; collection with auto-login pre-request script; environment; README | pre-request script does not re-login after token expiry (documented) |
| Deliverable: tests + instructions | DONE | README "Running tests" matches the scripts; CI runs all of it | — |
| Deliverable: Compose and/or hosted link | PARTIAL | Compose verified from a fresh project; `render.yaml` + `docs/DEPLOYMENT.md` | **hosted URL not live**: needs the candidate's Render/Neon accounts; `fromService` for the static site's `RENDER_EXTERNAL_URL` and the mocks' `MOCKS_PORT` vs Render's `PORT` unconfirmed until the first deploy |
| AI assistance declared; code explainable | DONE | README "AI assistance declaration"; no generated blobs | — |

---

## 2. Trap checklist (delta)

Every trap answered "yes" in the first review still holds; the ones that were qualified are
now closed:

| Trap | Then | Now |
| --- | --- | --- |
| 2FA tested | no test | `auth.e2e-spec.ts` full TOTP flow |
| Audit web screen | placeholder | `AuditPage.tsx` with diff and verify |
| Billing arrears / running balance | double-counted | one rule, tests assert the right figures |
| Late payments reach the FMIS | never | catch-up window, e2e |
| Late SUCCESS after failure | ignored | applied; lost reply matched via `clientRef` |
| Alert de-duplication | application-level | partial unique index |
| Reversal and SoD races | check-then-write | row locks inside the transactions |
| Bulk upload column order | positional | header-keyed |
| Per-reason bulk tests, revenue types, reject, ownership | missing | present |
| SoD per record "even with the permission" | conditional assertion | deterministic test |

---

## 3. Code-quality notes

- No `any`, no `eslint-disable`, no `console.log`/TODO in `src`; `console.*` only in CLI
  entry points (main, seed, scripts).
- Raw SQL: row locks (`assessment`, `payment`, `bill`, `reversal`, `role`, `"user"`,
  `audit_chain_head`) and the readiness probe only; no business table bypasses the audit.
- Every route handler is behind `@RequirePermission` (method or class level) or `@Public`;
  the authenticated-only exceptions are the self-service auth routes and `GET /events`.
- Unpaginated lists are bounded reference tables (tariffs, SoD rules, roles, permissions,
  revenue types, system config); every business list is paginated.
- Money never leaves `Decimal` except as statistics input (`alerts.service.ts`,
  `forecast.service.ts`), which is correct for z-scores and regression.

---

## 4. Engineering-standards audit

| Check | Result |
| --- | --- |
| `no-magic-numbers` via lint | 0 |
| Manual numeric grep over services/rules/controllers/clients | only named module-level constants in two rules files (`dashboard.rules.ts` `ISO_WEEK_PAD`, `MONTHS_PER_YEAR`; mocks `rates.rules.ts`) and the day-start suffix `T00:00:00.000Z` in two rules files (P2, unchanged) |
| Hard-coded status/role/permission/currency/GL/URL strings outside constants, enums, seed, tests, DTO examples | 2 hits: the local `SettlementDecision` literals in `settlement.rules.ts:41` and `payment-settlement.service.ts:117` (typed union, P2). The 20+ hits of the first review are gone |
| `process.env` outside `config/env.schema.ts` | 0 |
| Inline `interface`/`type`/`enum` outside allowed files | 0 (`job-payloads.ts` and `event-payloads.ts` are allowed by the standard and the lint config) |
| Tunables that could be `SystemConfig` | unchanged list (`WEAK_R2`, Holt α/β, `MIN_BASELINE_DAYS`, `EXPORT_MAX_ROWS`, `MAX_FILE_BYTES`, `MFA_CHALLENGE_TTL_SECONDS`, login throttle, FMIS range caps); `FX_REFRESH_MINUTES` is now honoured; new `FMIS_CATCH_UP_DAYS` is a `SystemConfig` key (P2) |
| Rules inside services | none; bulk-upload row validation moved to `bulk-uploads.rules.ts` |
| Cross-module Prisma access | unchanged read-side list (summaries, eligibility, profile aggregates) plus the writes in `reversals`, `readings-import`, `users` (P2, documented in READMEs) |
| External HTTP behind interfaces | yes, four `http-*` implementations only |
| Module READMEs | all 22 modules; none under `common/*` or the mocks (P2) |
| Migrations edited after creation | none (10 migrations, one commit each) |
| Indexes on filtered columns | `Payment.currency`, `Reversal.decidedAt`, `Bill.periodEnd` still unindexed (P2) |

---

## 5. Test coverage

Unit + e2e merged (istanbul), 2026-10-22 after phase 7:

| Scope | Lines | Branches | Functions |
| --- | --- | --- | --- |
| Unit only | 22 % | 23 % | 21 % |
| Unit + e2e | 93.2 % | 68.1 % | 87.1 % |

Every `*.rules.ts` file is at 93–100 % lines. Files below 70 % lines after merging:
`water/tariffs/tariffs.service.ts` (58 %) and `water/accounts/accounts.service.ts` (60 %),
both CRUD wrappers whose rules are 100 % covered. The first review's six under-covered
services (`sod`, `revenue-types`, `users`, `auth`, `tariffs`, `accounts`) are down to these two.

---

## 6. Prioritised fix list

### P0 — would fail the assessment
None.

### P1 — would lose marks

| # | Fix | Where | Effort |
| --- | --- | --- | --- |
| 1 | Demote the copied assumption subsections to `###` so "Assumptions" is one section and "Security" is not a duplicate top-level heading | `README.md` (`## Domain`, `## Security`, `## Security (phase 4)`, `## Operations`) | 5 min |
| 2 | Add the sentence that crons run only while the hosted service is awake and that opening the URL wakes it (phase 7 §6) | `README.md` demo links / limitations | 5 min |
| 3 | Deploy the blueprint (Neon project, Render blueprint, paste `DATABASE_URL`), then put the live URL in the README demo-links table and confirm the static site's `fromService` CORS value and the mocks' port detection | candidate's accounts; `render.yaml`, `README.md` | 30–60 min plus build time |
| 4 | Dashboard "billed" summed `Bill.totalDue`, which carries earlier arrears, so collection efficiency was understated once per cycle; aggregate each bill's own charges | `dashboard.rules.ts#aggregateBilling`, `summary.rebuild.ts` | 20 min |
| 5 | An older unpaid bill stayed payable after a later released bill rolled its balance into arrears, so the same debt could be collected twice; refuse payments on superseded bills (`BILL_SUPERSEDED`) and offer only the latest bill in self-service | `bills.rules.ts#supersedingBill`, `bills.service.ts#assertCurrent`, `payments.service.ts` lookup, web `self.rules.ts` | 1 h |
| 6 | `GET /audit/verify` answered ok when the chain-head row itself was missing | `audit.service.ts` | 10 min |

### P2 — polish

| # | Fix | Effort |
| --- | --- | --- |
| 4 | `.mailmap` to merge the four author identities | 5 min |
| 5 | Named constants out of rules files (`ISO_WEEK_PAD`, `MONTHS_PER_YEAR`, mocks numbers, `T00:00:00.000Z`) into `*.constants.ts` | 20 min |
| 6 | `SettlementDecision` as a const object instead of string literals | 10 min |
| 7 | Decide which tunables in §4 become `SystemConfig` keys | 1 h |
| 8 | Indexes on `Payment.currency`, `Reversal.decidedAt`, `Bill.periodEnd` | 20 min |
| 9 | Payments CSV export, FX-rate column, web `dateTo` end-of-day | 1.5 h |
| 10 | READMEs for `common/*` and `apps/mocks/src/*`; cross-module read policy stated | 1 h |
| 11 | Invalidate the FMIS ledger cache after a post; `MISSING_IN_IRCUB`; reject duplicate statement refs | 1 h |
| 12 | Encrypt `mfaSecret` at rest; count failed TOTP codes; one-time SSE tickets | 2 h |
| 13 | Bill-notification job idempotency; trends `refetchInterval`; Postman re-login after expiry | 1 h |
| 14 | `jest` / `ts-jest` major alignment | 15 min |
| 15 | SoD check-then-write across entities: `setRoles` locks the user, `setPermissions` locks the role, so a simultaneous role grant and permission edit can both pass; the `affected` user list is computed before the lock | 1 h (advisory lock keyed on the rule set) |
| 16 | Audit `createMany` with a single object `data` audits nothing; `skipDuplicates` rows are audited even when skipped (no current caller does either) | 30 min |

---

## 7. Outcome

Follow-up commits after this review (same day): P1 #1, #2 (README), #4 (billed totals),
#5 (superseded bills), #6 (missing chain head) and P2 #4 (`.mailmap`). Still open: P1 #3
(hosted deployment, needs the candidate's accounts) and the P2 list.
