# <module>

**Purpose.** One or two sentences: what business capability this module owns and which
brief requirement it satisfies.

**Rules.**

- The invariants this module enforces (database constraints, SoD checks, state transitions).
- Where its tunable parameters live (`SystemConfigKey.X`) and its fixed constants.
- Anything a maintainer must know before changing it (ordering, transactions, idempotency).

**Endpoints.** `VERB /path` — permission — one-line description, one per line.

**Testing.** Which `*.spec.ts` cover the rules and which `*.e2e-spec.ts` cover the flows;
how to run them (`pnpm --filter api test -- <pattern>`).
