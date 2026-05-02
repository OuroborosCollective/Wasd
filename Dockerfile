# Use Node 20 as base, aligning with monorepo requirement
FROM node:20-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Stage 1: Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy lockfile and workspace config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy all package.json files to allow pnpm to resolve dependencies without full source
COPY apps/ ./apps/
COPY packages/ ./packages/
COPY projects/ ./projects/
COPY server/package.json ./server/
COPY shared/package.json ./shared/
COPY engine/package.json ./engine/
COPY portal/package.json ./portal/

# Remove everything except package.json files to keep cache clean
RUN find apps packages projects -type f ! -name 'package.json' -delete

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Stage 2: Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

# Stage 3: Production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy only the necessary files for production
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/server/package.json ./server/
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/shared/package.json ./shared/
COPY --from=builder /app/shared/dist ./shared/dist
# Also copy node_modules
COPY --from=builder /app/node_modules ./node_modules

# Hardening
USER node

EXPOSE 3000

# Healthcheck using Node's fetch
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start the legacy server
CMD ["pnpm", "--filter", "@wasd/server-legacy", "start"]
