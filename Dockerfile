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

# Remove everything except package.json
RUN find packages apps projects -type f ! -name 'package.json' -delete || true
RUN find packages apps projects -type d -empty -delete || true

# VPS optimized dependency install.
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV CI=true
RUN pnpm config set network-concurrency 4 && \
    pnpm config set child-concurrency 1

# Patch only the Docker build copy of pnpm-lock.yaml.
# This keeps the install frozen/offline and avoids the heavy no-frozen path that
# was OOM-killed on the VPS.
RUN <<'EOF'
set -eu
python3 - <<'PY'
from pathlib import Path

lockfile = Path("pnpm-lock.yaml")
text = lockfile.read_text()
marker = "settings:\n  autoInstallPeers: true\n  excludeLinksFromLockfile: false\n\n"
overrides = """overrides:
  '@types/react': ^19.2.14
  '@types/react-dom': ^19.2.3
  '@types/node': ^22.19.18
  zod: ^4.4.3
  three: 0.184.0
  '@babylonjs/core': ^9.6.2
  '@babylonjs/materials': ^9.6.2
  '@babylonjs/loaders': ^9.6.2
  react: ^19.2.6
  socket.io-client: ^4.8.3
  pg: ^8.20.0
"""

if "\noverrides:\n" not in text:
    if marker not in text:
        raise SystemExit("Expected pnpm lockfile settings marker not found")
    text = text.replace(marker, marker + overrides + "\n", 1)

old = """  packages/core-ecs:
    dependencies:
      nanoid:
        specifier: ^5.1.11
        version: 5.1.11
    devDependencies:
      '@types/node':
        specifier: ^25.7.0
        version: 25.7.0
"""
new = """  packages/core-ecs:
    dependencies:
      nanoid:
        specifier: ^5.1.11
        version: 5.1.11
    devDependencies:
      '@types/node':
        specifier: ^22.19.18
        version: 25.7.0
"""
if old in text:
    text = text.replace(old, new, 1)
else:
    print("core-ecs lockfile specifier block already patched or not found")

lockfile.write_text(text)
PY
EOF

# Split fetch/install to lower memory pressure and keep final install offline.
RUN pnpm fetch --frozen-lockfile --prefer-offline
RUN pnpm install --frozen-lockfile --offline --ignore-scripts

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
