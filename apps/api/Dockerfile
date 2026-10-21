# syntax=docker/dockerfile:1.7
# Build context is the repository root (see docker-compose.yml / CI).

ARG NODE_IMAGE=node:22-alpine
ARG PNPM_VERSION=12.11.2

# ── deps + build ────────────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS build
ARG PNPM_VERSION
RUN apk add --no-cache openssl && npm install -g pnpm@${PNPM_VERSION}
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter api... --ignore-scripts
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @ircub/shared build \
 && pnpm --filter api exec prisma generate \
 && pnpm --filter api build \
 && pnpm --filter api --prod deploy --legacy /out/api

# ── runtime ─────────────────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS runtime
RUN apk add --no-cache openssl dumb-init
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out/api ./
# Pruned deploy drops the generated client; regenerate against the bundled schema.
RUN ./node_modules/.bin/prisma generate && mkdir -p storage && chown -R node:node /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/main"]
