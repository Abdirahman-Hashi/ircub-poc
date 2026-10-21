# apps/web

Vite + React 18 + Mantine SPA. See `CLAUDE.md` here for structure and rules.

```bash
pnpm --filter web dev        # :5173, proxies nothing — talks to VITE_API_URL directly
pnpm --filter web test       # Vitest
pnpm --filter web build      # typecheck + production bundle in dist/
```

Production image: `apps/web/Dockerfile` builds `dist/` and serves it with nginx
(`nginx.conf`), proxying `/api/*` to the `api` service.
