# apps/api — NestJS backend conventions

Root `CLAUDE.md` and `docs/DECISIONS.md` apply. This file adds API-specific rules.

## Module structure
```
src/
├── main.ts                      bootstrap: helmet, cookie-parser, ValidationPipe, Swagger, global filter
├── app.module.ts
├── config/                      env.schema.ts (zod), app-config.service.ts — the ONLY place process.env is read
├── prisma/                      PrismaService (with audit extension applied), prisma.module
├── common/
│   ├── audit/                   audit extension, hash chain, AuditLog service, verify endpoint
│   ├── auth/                    JwtStrategy, guards (JwtAuthGuard, PermissionsGuard), decorators
│   │                            (@RequirePermission, @CurrentUser, @Public)
│   ├── context/                 request-id middleware, AsyncLocalStorage request context
│   ├── csv/                     shared streaming CSV import pipeline (parse → validate → persist → summary)
│   ├── errors/                  AppException (ErrorCode from shared), GlobalExceptionFilter
│   ├── money/                   Decimal helpers, currency conversion, rounding (money.rules.ts)
│   ├── ids/                     TIN + control number generators and validators (ids.rules.ts, ids.constants.ts)
│   ├── jobs/                    pg-boss module, job-names.ts, job-payloads.ts
│   ├── logging/                 structured logger setup
│   └── sse/                     EventBus (RxJS Subject), event-names.ts, event-payloads.ts
└── modules/
    └── <domain>/
        ├── README.md                 10–20 lines: purpose, key rules, endpoints, how to test
        ├── <domain>.module.ts
        ├── <domain>.controller.ts    thin; DTO in, DTO out
        ├── <domain>.service.ts       orchestration + transactions; imports rules + types
        ├── <domain>.rules.ts         pure functions (no Nest/Prisma); unit-tested
        ├── <domain>.types.ts         interfaces/types used by this module
        ├── <domain>.constants.ts     fixed domain constants
        ├── <domain>.messages.ts      user-facing error/notification messages
        ├── dto/                      one class per file: create-x.dto.ts, x-filter.dto.ts, x.response.dto.ts
        └── *.spec.ts
```

Module list:
    ├── users/  roles/  permissions/  sod/
    ├── payers/ revenue-types/ assessments/ bulk-uploads/ reversals/
    ├── water/ (accounts, meters, readings, tariffs, billing-cycles, bills, statements)
    ├── payments/ fx/ channels/ reconciliation/
    ├── fmis/ (gl-mappings, journal-batches, fmis-reconciliation)
    ├── dashboard/ (summaries, forecast, alerts, targets)
    ├── notifications/
    └── audit/ (read-only API over AuditLog)
```

## Rules
- `docs/ENGINEERING-STANDARDS.md` §1–§8 apply in full: no literals in logic (constants,
  `SystemConfigKey`, env schema, shared enums/codes), no type declarations outside
  `*.types.ts` / `dto/` / shared, pure `*.rules.ts`, interfaces for external systems.
- Runtime-tunable parameters go through `SystemConfigService.get(SystemConfigKey.X)` with a
  typed default; add the key, the default and a seed entry in the same commit.
- Controllers are thin: validate DTO, call service, return DTO. No Prisma calls in controllers.
- Every controller method has `@ApiOperation`, `@ApiResponse`, and `@RequirePermission`
  (or `@Public()` for login/health/callback endpoints).
- Services throw `AppException(code, message, status, details?)`; never return `null` to
  signal errors.
- Pagination: `?page=1&pageSize=25` → `{ items, total, page, pageSize }`. Filters as query
  params with a `FilterDto` per list endpoint (class-validator). Sorting via `sort=field:asc`.
- List endpoints that the brief calls "advanced filters" must support every filter named in
  the brief (payer, revenue type, amount range, channel, status, date range).
- Use Prisma transactions (`$transaction`) for any multi-row business operation (billing run,
  bulk import, payment application, journal batch build).
- Money: import `Decimal` from `decimal.js`; convert Prisma Decimal with `new Decimal(x.toString())`.
- Dates: store `timestamptz`; business "day" is UTC date (state in assumptions). Use `date-fns`.
- Logging: Nest `Logger` with module context; log job start/finish/failure with ids.
- Env: all config read through `ConfigService` with a zod-validated schema; fail fast on boot.
- Tests live next to code: `*.spec.ts` (unit) and `test/*.e2e-spec.ts` (e2e).
- Swagger tags = module names; DTOs use `@ApiProperty` with examples.

## Permission codes (defined in packages/shared, seeded in phase 1)
```
users.manage  roles.manage  config.manage
payers.view  payers.register  payers.review_duplicates
revenue_types.manage  assessments.view  assessments.create
payments.view  payments.capture  payments.supervise
reversals.capture  reversals.approve
bulk_uploads.create
meters.read  billing.run  billing.release  bills.view
fx.view  reconciliation.view  reconciliation.run
fmis.view  fmis.post  gl_mappings.manage
dashboard.view  targets.manage  alerts.view
audit.view  reports.view
self.view  self.pay
```
Role → permission mapping lives in `prisma/seed/roles.ts`. SoD rule seeded:
`reversals.capture` ⟂ `reversals.approve`.
