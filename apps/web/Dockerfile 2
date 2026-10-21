# syntax=docker/dockerfile:1.7
ARG NODE_IMAGE=node:22-alpine
ARG PNPM_VERSION=12.11.2

FROM ${NODE_IMAGE} AS build
ARG PNPM_VERSION
# Empty → the bundle calls same-origin /api, which nginx proxies to the api container.
ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL}
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter web... --ignore-scripts
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @ircub/shared build && pnpm --filter web build

# Unprivileged nginx listens on 8080 and runs as uid 101.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --retries=5 CMD wget -qO- http://127.0.0.1:8080/ || exit 1
