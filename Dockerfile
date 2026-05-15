# syntax=docker/dockerfile:1.7

# =========================================================
# BASE
# =========================================================
FROM node:22-alpine AS base

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
ARG WORKSPACE_MANIFEST_CACHE_BUST=2026-05-15-0006
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

# Remove everything except package.json from copied workspace trees
RUN find packages apps projects -type f ! -name 'package.json' -delete || true
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
RUN python3 scripts/sync-pnpm-lockfile-for-docker.py

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

# Copy source
COPY . .

ENV NODE_ENV=production

# Build optimization for 16GB VPS
ENV NODE_OPTIONS="--max-old-space-size=12288"

# Parallelism optimization
ENV CI=true
ENV TURBO_CONCURRENCY=4

# Build
RUN pnpm build

# Prune dev dependencies
RUN pnpm prune --prod

# Deploy isolated runtime package
RUN pnpm --filter @wasd/server deploy /app/prod-server

# =========================================================
# RUNTIME
# =========================================================
FROM node:22-alpine AS runner

WORKDIR /app

# Runtime dependencies only
RUN apk add --no-cache \
    dumb-init \
    libc6-compat

# Environment
ENV NODE_ENV=production
ENV PORT=3000

# VPS runtime optimization
ENV NODE_OPTIONS="\
--max-old-space-size=12288 \
--max-semi-space-size=512 \
--optimize-for-size"

# WebSocket / MMO scaling
ENV UV_THREADPOOL_SIZE=16

# Security
RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs

# Copy deployed app
COPY --from=builder /app/prod-server ./

# Permissions
RUN chown -R nodeuser:nodejs /app

USER nodeuser

# Exposed ports
EXPOSE 3000
EXPOSE 8080
EXPOSE 443

# Healthcheck
HEALTHCHECK --interval=30s \
    --timeout=5s \
    --start-period=20s \
    --retries=5 \
    CMD node -e "\
    fetch('http://127.0.0.1:3000/health')\
    .then(r => r.ok ? process.exit(0) : process.exit(1))\
    .catch(() => process.exit(1))"

# Proper PID1 handling
ENTRYPOINT ["dumb-init", "--"]

# Start app
CMD ["node", "dist/index.js"]
