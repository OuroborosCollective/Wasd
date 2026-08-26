# syntax=docker/dockerfile:1.7

# =========================================================
# BASE
# =========================================================
FROM node:22.23.2-alpine AS base

# System optimizations
RUN apk add --no-cache \
    libc6-compat \
    dumb-init \
    python3 \
    make \
    g++

# Enable pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

# Shared store for faster installs
RUN pnpm config set store-dir /pnpm/store

# =========================================================
# DEPENDENCIES
# =========================================================
FROM base AS deps

WORKDIR /app

# Invalidate workspace manifest cache after dependency graph corrections.
ARG WORKSPACE_MANIFEST_CACHE_BUST=2026-05-16-0010
RUN echo "workspace manifest cache bust: ${WORKSPACE_MANIFEST_CACHE_BUST}"

# Workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Workspace package manifests only
COPY packages packages
COPY apps apps
COPY projects projects
COPY server/package.json server/package.json
COPY client/package.json client/package.json
COPY engine/package.json engine/package.json
COPY portal/package.json portal/package.json
COPY scripts/sync-pnpm-lockfile-for-docker.py scripts/sync-pnpm-lockfile-for-docker.py

# Remove everything except package.json from copied workspace trees.
# SDK examples are intentionally excluded from the server Docker image build.
RUN find packages apps projects -type f ! -name 'package.json' -delete || true
RUN rm -rf packages/sdk-examples || true
RUN find packages apps projects -type d -empty -delete || true

# VPS optimized dependency install.
ENV NODE_OPTIONS="--max-old-space-size=768"
ENV CI=true
ENV npm_config_jobs=1
RUN pnpm config set network-concurrency 2 && \
    pnpm config set child-concurrency 1 && \
    pnpm config set side-effects-cache false

# Self-heal only the Docker build copy of pnpm-lock.yaml.
# This syncs root override metadata and importer specifiers from package.json,
# keeping install frozen while avoiding the VPS OOM-prone no-frozen path.
ARG PNPM_PREFLIGHT_CACHE_BUST=2026-05-16-0010
RUN echo "pnpm preflight cache bust: ${PNPM_PREFLIGHT_CACHE_BUST}" && \
    python3 scripts/sync-pnpm-lockfile-for-docker.py

# Single frozen install. A separate pnpm fetch step was OOM-killed on the VPS.
RUN pnpm install --frozen-lockfile --prefer-offline --ignore-scripts

# =========================================================
# BUILDER
# =========================================================
FROM base AS builder

WORKDIR /app

# Reuse dependencies
COPY --from=deps /pnpm /pnpm
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app ./

# Copy source. This overwrites pnpm-lock.yaml with the repository copy, so run
# the same preflight again before invoking the server build.
COPY . .
RUN rm -rf packages/sdk-examples || true
ARG PNPM_BUILDER_PREFLIGHT_CACHE_BUST=2026-05-16-0010
RUN echo "pnpm builder preflight cache bust: ${PNPM_BUILDER_PREFLIGHT_CACHE_BUST}" && \
    python3 scripts/sync-pnpm-lockfile-for-docker.py

ENV NODE_ENV=production

# Build optimization for 16GB VPS
ENV NODE_OPTIONS="--max-old-space-size=12288"

# Server container build only. Do not build browser/demo workspaces here.
# Core-logic must be built before server because server re-exports AREInvariantGuard
# from @wasd/core-logic package exports at runtime. Runtime build intentionally skips DTS.
RUN pnpm --filter @wasd/core-logic --if-present run build:runtime && \
    pnpm --filter @wasd/shared --if-present build && \
    pnpm --filter @wasd/server --if-present build

# Force client-2d build and verify the builder artifact exists.
RUN pnpm --filter ./apps/client-2d... run build
RUN test -f /app/apps/client-2d/dist/index.html

# Prune dev dependencies
RUN pnpm prune --prod

# Deploy isolated runtime package
RUN pnpm --filter @wasd/server deploy /app/prod-server

# =========================================================
# RUNTIME
# =========================================================
FROM node:22.23.2-alpine AS runner

WORKDIR /app

# Runtime dependencies only
RUN apk add --no-cache \
    dumb-init \
    libc6-compat

# Environment
ENV NODE_ENV=production
ENV PORT=3001
ENV GAME_PORT=3001
ENV HOST=0.0.0.0

# Runtime Node memory options. Do not include --optimize-for-size; Node 22
# rejects it inside NODE_OPTIONS.
ENV NODE_OPTIONS="--max-old-space-size=12288 --max-semi-space-size=512"

# WebSocket / MMO scaling
ENV UV_THREADPOOL_SIZE=16

# Security
RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs

# Copy deployed app
COPY --from=builder /app/prod-server ./

# Copy client-2d runtime assets into the Express static directory.
# ServerBootstrap serves production frontend files from ./client/dist.
COPY --from=builder /app/apps/client-2d/dist ./client/dist/2d
RUN test -f /app/client/dist/2d/index.html

# Permissions
RUN chown -R nodeuser:nodejs /app

USER nodeuser

# Exposed ports
EXPOSE 3001
EXPOSE 8080
EXPOSE 443

# Healthcheck
HEALTHCHECK --interval=30s \
    --timeout=5s \
    --start-period=20s \
    --retries=5 \
    CMD node -e "\
    fetch('http://127.0.0.1:3001/health')\
    .then(r => r.ok ? process.exit(0) : process.exit(1))\
    .catch(() => process.exit(1))"

# Proper PID1 handling
ENTRYPOINT ["dumb-init", "--"]

# Start app
CMD ["node", "dist/index.js"]
