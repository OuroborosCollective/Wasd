FROM node:20-alpine AS base

# Install pnpm and corepack
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

# Stage 1: Install all dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy workspace configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./

# Copy all package.json files dynamically
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY shared/package.json ./shared/
COPY engine/package.json ./engine/
COPY portal/package.json ./portal/
COPY apps/ ./apps/
COPY packages/ ./packages/
COPY projects/ ./projects/

# Remove everything but package.json files to keep layer small and cacheable
RUN find apps packages projects -type f ! -name "package.json" -delete

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

# Stage 2: Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the monorepo
RUN pnpm build

# Stage 3: Production runner
FROM base AS runner
WORKDIR /app

# Set non-root environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy built artifacts and necessary files
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY server/package.json ./

# Hardening: Use non-privileged user
USER node

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "dist/index.js"]
