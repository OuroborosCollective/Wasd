FROM node:22-alpine AS base

# Install pnpm and corepack
RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

# Stage 1: Build the application
FROM base AS builder
WORKDIR /app

# Teleport pattern: Copy only package manifests first for better layer caching.
# Docker COPY does not support shell redirections — copy all sources, then use
# a shell step to arrange package.json files into the workspace tree.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy the full directory tree of package.json files in one layer.
# Each workspace package needs its package.json in the correct path for
# pnpm install --frozen-lockfile to resolve the workspace graph.
COPY packages/ packages/
COPY apps/ apps/
COPY projects/ projects/
COPY server/package.json server/package.json
COPY client/package.json client/package.json
COPY engine/package.json engine/package.json
COPY portal/package.json portal/package.json

# Strip everything except package.json from copied dirs (keeps layer small).
RUN find packages apps projects -type f ! -name 'package.json' -delete 2>/dev/null; \
    find packages apps projects -type d -empty -delete 2>/dev/null; \
    true

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Build the monorepo
ENV NODE_ENV=production
RUN pnpm build

# Use pnpm deploy to isolate the server package
RUN pnpm --filter @wasd/server deploy /app/prod-server

# Stage 2: Production runner
FROM base AS runner
WORKDIR /app

# Set non-root environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy the deployed package from the builder stage
COPY --from=builder /app/prod-server ./

# Hardening: Use non-privileged user
USER node

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "dist/index.js"]
