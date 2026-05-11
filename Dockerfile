FROM node:22-alpine AS base

# Install pnpm and corepack
RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

# Stage 1: Build the application
FROM base AS builder
WORKDIR /app

# Teleport pattern: Copy only package files first for better layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy individual package.json files for workspace packages
COPY packages/*/package.json packages/
COPY apps/*/package.json apps/
COPY projects/*/package.json projects/ 2>/dev/null || true
COPY server/package.json server/ 2>/dev/null || true
COPY client/package.json client/ 2>/dev/null || true
COPY engine/package.json engine/ 2>/dev/null || true
COPY portal/package.json portal/ 2>/dev/null || true

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
