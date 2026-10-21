# @ircub/shared

Runtime-dependency-free package holding everything the API, web and mocks must agree on:

- `enums.ts` — domain enums, mirrored 1:1 by Prisma enums.
- `permissions.ts` — permission codes (`resource.action`), union type and admin-UI groups.
- `roles.ts` — codes of the six built-in roles.
- `error-codes.ts` — `ErrorCode` enum used by `AppException` and the web error handling.
- `constants/` — identifier formats, money scales, pagination defaults, CSV templates, API header names.
- `types/` — contract types (error body, health, pagination envelope, SSE envelope).

Consumed as a built workspace package (`dist/`) by the Nest apps and aliased to `src/` by Vite.
`pnpm --filter @ircub/shared build` (runs automatically on `pnpm install`).
