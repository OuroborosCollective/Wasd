FROM node:22-alpine AS base

# Install pnpm and corepack
RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

# Stage 1: Build the application
FROM base AS builder
WORKDIR /app
COPY . .

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

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
