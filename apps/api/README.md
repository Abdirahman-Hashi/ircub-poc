# apps/api

NestJS backend. See `CLAUDE.md` in this directory for module conventions and
`docs/ENGINEERING-STANDARDS.md` for the rules lint enforces.

```bash
pnpm --filter api dev            # watch mode on :3000, Swagger at /docs
pnpm --filter api test           # unit tests (*.spec.ts, no database)
pnpm --filter api test:e2e       # migrates the test DB (docker-compose.test.yml) then runs test/*.e2e-spec.ts
pnpm --filter api prisma migrate dev --name <change>
pnpm --filter api prisma db seed
pnpm --filter api openapi:export # writes docs/openapi.json
```
