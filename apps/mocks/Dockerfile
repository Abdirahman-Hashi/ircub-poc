# syntax=docker/dockerfile:1.7
ARG NODE_IMAGE=node:22-alpine
ARG PNPM_VERSION=12.11.2

FROM ${NODE_IMAGE} AS build
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/mocks/package.json apps/mocks/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter mocks... --ignore-scripts
COPY packages/shared packages/shared
COPY apps/mocks apps/mocks
RUN pnpm --filter @ircub/shared build \
 && pnpm --filter mocks build \
 && pnpm --filter mocks --prod deploy --legacy /out/mocks

FROM ${NODE_IMAGE} AS runtime
RUN apk add --no-cache dumb-init
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out/mocks ./
USER node
EXPOSE 3100
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3100/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
