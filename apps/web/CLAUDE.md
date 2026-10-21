# apps/web — React SPA conventions

Root `CLAUDE.md` and `docs/DECISIONS.md` apply. This file adds frontend-specific rules.

## Structure
```
src/
├── main.tsx                 MantineProvider, QueryClientProvider, RouterProvider, Notifications
├── app/
│   ├── router.tsx           TanStack Router route tree; each route declares `requiredPermission`
│   ├── AppShell.tsx         Mantine AppShell: header (user, bell/alerts, logout), navbar
│   └── nav.ts               nav items with permission codes; filtered by `useCan()`
├── lib/
│   ├── api.ts               fetch wrapper: base URL, bearer token, refresh-on-401, typed errors
│   ├── auth.tsx             AuthProvider: user, permissions, login/logout/mfa, `useCan(code)`
│   ├── sse.ts               EventSource helper with reconnect
│   └── format.ts            money (SOS/USD), dates, numbers
├── components/              DataTable (mantine-react-table wrapper), FilterBar, MoneyText,
│                            StatusBadge, ConfirmModal, CsvUploader (dry-run preview → confirm → summary)
└── features/
    ├── auth/        login, mfa challenge, mfa enrol
    ├── admin/       users, roles (permission matrix), sod rules, config
    ├── payers/      list, register, profile (360° tabs: assessments, water accounts, bills, payments, balance), duplicates review
    ├── revenue/     revenue types, assessments (create, list with advanced filters), bulk upload, reversals (capture / approve queue)
    ├── water/       accounts, meters, readings (single + CSV), tariffs, billing cycles (run → review flagged → release), bills, statements
    ├── payments/    capture/initiate, list + filters, live status (SSE), channel reconciliation
    ├── fmis/        gl mappings, journal batches, fmis reconciliation (per GL/day → drill-down)
    ├── dashboard/   executive dashboard: trends, targets, efficiency, forecast, alerts
    ├── audit/       audit log viewer + chain verify button
    └── self/        customer portal: my bills, my assessments, pay
```

## Rules
- `docs/ENGINEERING-STANDARDS.md` §9 applies: no literal permission codes, route paths,
  status strings, API paths or colours in components. Use `PERMISSIONS.*`, `ROUTES.*`
  (`app/routes.constants.ts`), enums/types from `@ircub/shared` via `src/api/types/`,
  `API_PATHS.*` (`api/api-paths.constants.ts`), Mantine theme tokens. Component prop
  interfaces live in `ComponentName.types.ts` when non-trivial; zod schemas in
  `features/<domain>/<name>.schema.ts`.
- Only render navigation items and action buttons the user has permission for (`useCan`).
  Server still enforces; the UI just hides. Taxpayer/Customer users land on `/me`.
- Server state via TanStack Query; keys namespaced by feature (`['payments', filters]`).
  Invalidate after mutations. No global client state store.
- Forms: react-hook-form + zod; show field errors inline; show API `code`/`message` in a
  notification on failure.
- Tables: `components/DataTable` wrapping mantine-react-table with server-side pagination,
  sorting, and a `FilterBar` built from a filter schema. Reuse it everywhere.
- Money: always `MoneyText` (formats SOS/USD, 2 dp, thousands separators).
- Charts: Recharts `LineChart`/`BarChart`; forecast segment dashed; show R² and model name
  under the chart.
- Loading/empty/error states for every list and page. A full-screen "API is waking up…"
  state when the health check fails (hosted cold start).
- Keep styling to Mantine defaults + a small theme (primary colour, font). No custom CSS
  frameworks.
- TypeScript strict; API types imported from `@ircub/shared` where they exist.
- Tests (Vitest): `nav.filter` by permissions, `CsvUploader` summary rendering,
  `MoneyText` formatting.
