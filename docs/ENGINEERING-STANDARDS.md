# Engineering Standards

These standards apply to every file in the repository. They are enforced by ESLint rules,
pre-commit hooks and CI (set up in phase 0), and audited by `/review`. The goal is code a
senior engineer would sign off on and the candidate can defend line by line.

## 1. No hard-coded values

**Rule:** a literal (number, string, duration, URL, regex, threshold, limit, currency code,
GL code, role code, permission code, status string) appears in exactly one place: a named
constant, an enum, a config value or the database. Business code imports it.

| Kind of value | Where it lives | Example |
|---|---|---|
| Runtime-tunable business parameter | `SystemConfig` table (seeded defaults) read through `ConfigService`/`SystemConfigService` | abnormal-consumption threshold %, payment status retry limit, password policy numbers, cash GL code, local currency |
| Deployment/infrastructure value | environment variable, validated by the zod env schema in `apps/api/src/config/env.schema.ts` | `DATABASE_URL`, `MOCKS_BASE_URL`, JWT secrets/TTLs, callback secret, ports, CORS origin |
| Fixed domain constant | `*.constants.ts` next to its module, or `packages/shared/src/constants/` when web needs it too | TIN prefix/length, control-number length, check-digit modulus, meter max digits default, CSV template columns, pagination defaults |
| Enumerations / codes | `packages/shared/src/enums.ts`, `permissions.ts`, `roles.ts`, `error-codes.ts` | `PaymentStatus.CONFIRMED`, `PERMISSIONS.PAYMENTS_CAPTURE`, `ErrorCode.SOD_VIOLATION` |
| Job names, event names, cache keys, SSE event types | `common/jobs/job-names.ts`, `common/sse/event-names.ts` | `JOB.PAYMENT_STATUS_CHECK`, `SSE_EVENT.PAYMENT_UPDATED` |
| Messages shown to users | `*.messages.ts` per module (API error messages), or the component file for UI copy | `MESSAGES.READING_BELOW_PREVIOUS` |
| Reference data | seed files | revenue types, tariffs, GL mappings, targets |

**Allowed literals:** `0`, `1`, `-1`, array indices, HTTP status codes passed through Nest's
own enums (`HttpStatus.FORBIDDEN`), and test fixtures. Everything else is a lint error
(`no-magic-numbers`) or a review finding (strings).

```ts
// ❌ not acceptable
if (consumption > avg * 2) { ... }
await boss.send('payment-status-check', payload, { retryLimit: 3, startAfter: 60 });
if (user.role === 'REVENUE_SUPERVISOR') { ... }

// ✅ acceptable
const thresholdPct = await this.systemConfig.get(SystemConfigKey.ABNORMAL_CONSUMPTION_THRESHOLD_PCT);
if (isAbnormal(consumption, history, thresholdPct)) { ... }

await this.jobs.enqueue(JOB.PAYMENT_STATUS_CHECK, payload, {
  retryLimit: await this.systemConfig.get(SystemConfigKey.PAYMENT_STATUS_RETRY_LIMIT),
  startAfter: PAYMENT_STATUS_CHECK.INITIAL_DELAY_SECONDS,
});

if (!(await this.permissions.can(user.id, PERMISSIONS.REVERSALS_APPROVE))) { ... }
```

## 2. Types live in type files, never inline above the function that uses them

**Rule:** every `interface`, `type`, `enum` and DTO class is declared in a dedicated file
and imported. No type declarations inside a service/controller/component file other than
the class the file exports. No inline object types in function signatures beyond trivial
`{ id: string }`-style destructuring in tests.

| What | File | Notes |
|---|---|---|
| Request/response DTOs | `modules/<domain>/dto/<name>.dto.ts` | one class per file, class-validator + `@ApiProperty` decorators; response DTOs too (`*.response.dto.ts`) |
| Domain types used across services (results, options, computed structures) | `modules/<domain>/<domain>.types.ts` | e.g. `ConsumptionResult`, `TierBreakdownLine`, `ReconciliationSummary` |
| Types shared by api **and** web | `packages/shared/src/types/<domain>.types.ts` | derived from the API contracts; web never redeclares them |
| Job payloads | `common/jobs/job-payloads.ts` | one interface per job name, keyed by the `JOB` constant |
| SSE event payloads | `common/sse/event-payloads.ts` | discriminated union on `type` |
| Error codes | `packages/shared/src/error-codes.ts` | `ErrorCode` enum; `AppException` only accepts `ErrorCode` |
| Config keys | `modules/system-config/system-config.keys.ts` | `SystemConfigKey` enum + a typed defaults map; `get()` is generic over the key |
| Prisma-derived types | import from `@prisma/client` or `Prisma.<Model>GetPayload<…>` in a `<domain>.types.ts` | never retype what Prisma already generates |
| Web: API types | `apps/web/src/api/types/` re-exporting from `@ircub/shared` | web components import from here only |
| Web: component props | `ComponentName.types.ts` beside the component when more than two props | tiny props may stay inline in the component file |

```ts
// ❌ not acceptable (apps/api/src/modules/water/readings.service.ts)
type ConsumptionResult = { consumption: number; abnormal: boolean };
export class ReadingsService { compute(...): ConsumptionResult { ... } }

// ✅ acceptable
// apps/api/src/modules/water/water.types.ts
export interface ConsumptionResult { readonly consumption: number; readonly abnormal: boolean; readonly abnormalReason?: string }
// apps/api/src/modules/water/readings.service.ts
import { ConsumptionResult } from './water.types';
```

Enforced by ESLint: `@typescript-eslint/consistent-type-definitions`, a custom
`no-restricted-syntax` rule flagging `TSInterfaceDeclaration`/`TSTypeAliasDeclaration`/
`TSEnumDeclaration` in files not matching `*.types.ts|*.dto.ts|*.constants.ts|*.keys.ts|
*.payloads.ts|enums.ts|permissions.ts|roles.ts|error-codes.ts|*.spec.ts`.

## 3. Layering and dependencies

- Controller → Service → Repository/Prisma. Controllers never touch Prisma; services never
  read `Request`. Cross-module calls go through the other module's exported service, never
  its Prisma models directly.
- External systems sit behind an interface (`ChannelClient`, `FmisClient`,
  `NotificationSender`, `FxRateProvider`) with the HTTP implementation injected via a Nest
  provider token; tests inject fakes. This is what makes "mock services" swappable for real
  ones without touching business code.
- Pure business rules (tariff calculation, consumption, check digits, FX rounding, z-score,
  regression) are pure functions in `*.rules.ts` files with no Nest or Prisma imports, so
  they are unit-tested in isolation and readable in one screen.
- Transactions are explicit (`prisma.$transaction`) and scoped to the service method that
  owns the invariant.

## 4. Errors and observability

- All failures are `AppException(ErrorCode, message, status, details?)`; a global filter
  shapes the response; unknown errors are logged with a correlation id and returned as
  `INTERNAL_ERROR` without leaking internals.
- Every request carries an `x-request-id` (generated if absent) that appears in logs and in
  error responses. Logs are structured (Nest `Logger` with JSON output in production,
  `nestjs-pino` is acceptable) and include module, requestId, actorId, and key entity ids.
- Jobs log start/finish/failure with job id and payload ids; failures include attempt count.
- `GET /health` (liveness) and `GET /ready` (DB + pg-boss) are separate.

## 5. Security hygiene

- Secrets only via env; `.env` git-ignored; `.env.example` complete and commented.
- Login and callback endpoints rate-limited (`@nestjs/throttler`), constant-time HMAC
  compare, argon2id, refresh-token rotation with reuse detection, helmet, strict CORS.
- Input validation on every endpoint (`whitelist`, `forbidNonWhitelisted`); file uploads
  limited by size and MIME; CSV parsed streaming with a row cap from config.
- Authorisation checks on data ownership for customer endpoints (`payerId` scope), not only
  permission codes.

## 6. Data and migrations

- Every schema change is a new Prisma migration with a descriptive name; migrations are
  never edited after commit.
- Indexes exist for every filter/sort column used by a list endpoint and every FK.
- Money is `Decimal`; dates are `timestamptz`; soft-delete is not used — status fields are.
- Seed is deterministic (`faker.seed(42)`) and idempotent.

## 7. Tests

- Unit tests for every `*.rules.ts` function and every service method that enforces an
  invariant; e2e for every flow the brief names; a test name reads as the rule it proves
  (`rejects a reading lower than the previous unless rollover`).
- No test asserts on implementation details (call counts on Prisma mocks) when the outcome
  can be asserted instead.
- CI runs lint, typecheck, unit and e2e on every push.

## 8. Git and documentation

- Conventional Commits; `commitlint` + `husky` enforce the format; `lint-staged` runs
  ESLint/Prettier on staged files.
- ADRs in `docs/DECISIONS.md`; assumptions in `docs/ASSUMPTIONS.md`; each module has a short
  `README.md` (10–20 lines: purpose, key rules, main endpoints, how to test).
- Comments explain *why* (the business rule, the brief clause, the trade-off), never *what*
  the next line does.

## 9. Frontend equivalents

- No literal permission strings, route paths, status strings or colours in components:
  `PERMISSIONS.*`, `ROUTES.*` (`app/routes.constants.ts`), enums from `@ircub/shared`,
  theme tokens.
- API calls only through typed functions in `src/api/<domain>.api.ts`; components never
  call `fetch`.
- Forms validate with zod schemas in `features/<domain>/<name>.schema.ts`, shared with the
  DTO shape where practical.
