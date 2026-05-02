# Use Node 20 as the base for all stages
FROM node:20-alpine AS base

# Install pnpm and system dependencies
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate
RUN apk add --no-cache libc6-compat

# Stage 1: Install all dependencies
FROM base AS deps
WORKDIR /app

# Copy lockfile and workspace config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy all package.json files from the workspace to allow pnpm to resolve dependencies correctly
# We use a trick to copy only package.json files while preserving the directory structure
COPY apps/ ./apps/
COPY packages/ ./packages/
COPY projects/ ./projects/
COPY server/package.json ./server/
COPY shared/package.json ./shared/
COPY client/package.json ./client/
COPY engine/package.json ./engine/
COPY portal/package.json ./portal/

# Clean up anything that isn't a package.json to keep the layer small and focused on deps
RUN find apps packages projects -type f ! -name "package.json" -delete

# Install dependencies (including dev)
RUN pnpm install --frozen-lockfile

# Stage 2: Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm -r build

# Stage 3: Production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Use non-root user
USER node

# Copy only the necessary files for production
# This is a generic example; in a real scenario, you'd copy specific apps
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
# Copy built packages (assuming 'dist' contains the output)
COPY --from=builder /app/packages/*/dist ./packages/*/dist
COPY --from=builder /app/apps/*/dist ./apps/*/dist
COPY --from=builder /app/server/dist ./server/dist
# Copy production node_modules (this is complex in pnpm monorepos,
# often 'pnpm deploy' is preferred, but for now we copy the whole tree)
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

# Simple healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["pnpm", "start"]
