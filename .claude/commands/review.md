---
description: Self-audit the codebase against every requirement in the brief; report gaps, do not fix
---

Act as the assessor. Do **not** change code in this command — produce a report only.

Read `docs/BRIEF.md` and walk every numbered requirement and every "Output" bullet of
Modules 1–7 plus the "POC Submission Deliverables" list. For each item, find the concrete
evidence in the repo (endpoint + controller file, service method, screen/route, test name)
by reading the code, not `docs/PROGRESS.md`. Then write `docs/REVIEW-<date>.md` with:

1. A table: `Requirement | Status (DONE / PARTIAL / MISSING) | Evidence (file:line, route, test) | Gap / risk`.
2. The "trap" checklist, each answered with evidence:
   - Permissions configurable in DB at runtime, custom roles, hierarchy
   - Segregation of duties enforced server-side (capturer ≠ approver) and configurable
   - Password policy, lockout, optional 2FA, logout revokes
   - Unique TIN, duplicate detection on phone/email/national ID, review queue
   - Control number per assessment with check digit
   - Bulk uploader: validate before save, per-row rejection reasons, dry-run preview
   - Audit: who/when/before/after in a separate table; tamper-evident (hash chain + verify)
   - Advanced filters: payer, revenue type, amount range, channel, status, date range
   - Readings below previous rejected unless rollover/replacement; CSV upload
   - Billing cycle: tiered tariff, arrears carried, payments applied; PDF; mock SMS/email
   - Abnormal consumption > 200 % of 3-month average blocks release
   - Customer statement with running balance
   - Multi-currency with dynamic rates from a separate mock API
   - Initiate → callback → verify → update; callback signature verified; idempotent
   - Retry status check up to 3 times → permanently failed → supervisor notified
   - Daily channel reconciliation vs statement file
   - Revenue type → GL mapping configurable
   - Daily journal batches auto-created; statuses Pending/Posted/Failed/Reversed
   - FMIS reference stored; same payment never posted twice (DB constraint)
   - Reconciliation screen IRCUB vs FMIS per GL per day with drill-down
   - Dashboard: trends by type and channel, collections vs targets, billed vs collected
   - Forecast via linear regression with justification
   - Real-time anomaly alerts; pre-aggregated data; async updates (SSE)
   - Deliverables: Git history, README (setup/stack/assumptions/limitations), ERD, seed,
     OpenAPI + Postman, automated tests + instructions, Compose and/or hosted link
   - AI assistance declared; code explainable (no opaque generated blobs)
3. Code-quality notes: error handling gaps, missing validation, any `any`, money as
   `number`, raw SQL bypassing audit, endpoints without `@RequirePermission`, list
   endpoints without pagination.
4. **Engineering-standards audit** (`docs/ENGINEERING-STANDARDS.md`) — run these and
   list every hit with file:line:
   - Magic numbers: `pnpm lint` output for `no-magic-numbers`, plus a manual grep for
     numeric literals in `*.service.ts`, `*.rules.ts`, `*.job.ts`, components.
   - Hard-coded strings: grep for quoted role codes, permission codes, status values, job
     names, event names, GL codes, currency codes, URLs and paths outside
     `*.constants.ts`, `enums.ts`, `permissions.ts`, `roles.ts`, `error-codes.ts`, seed,
     tests and `.env.example`. Grep for `process.env` outside `config/env.schema.ts`.
   - Inline types: `grep -rnE "^(export )?(interface|type|enum) " apps packages --include=*.ts --include=*.tsx`
     and flag any file not matching the allowed patterns.
   - Tunables that should be `SystemConfig` but are constants (thresholds, retry limits,
     policy numbers) — list them.
   - Rules living inside services instead of `*.rules.ts`; services importing another
     module's Prisma models directly; external HTTP calls not behind an interface.
   - Modules without `README.md`; migrations edited after creation; missing indexes on
     filtered columns.
   Treat each hit as P1 unless it is in a test or seed file.
5. Test coverage: run `pnpm test -- --coverage` for api and list rule-bearing services
   below 70 % line coverage.
6. A prioritised fix list (P0 = would fail the assessment, P1 = would lose marks, P2 = polish)
   with an effort estimate each.

End by printing the P0 and P1 lists in the chat.
