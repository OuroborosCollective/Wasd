FROM node:20-alpine AS base

# Install pnpm and corepack
RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

# Stage 1: Build the application
FROM base AS builder
WORKDIR /app
COPY . .

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

# Build the monorepo
RUN pnpm build

# Stage 2: Production runner
FROM base AS runner
WORKDIR /app

# Set non-root environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy built artifacts and necessary files
# Use pnpm deploy to create a pruned production standalone for the server
# However, for simplicity and reliability in this environment, we follow the established pattern
# but optimized for the monorepo structure.
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/package.json ./

# Hardening: Use non-privileged user
USER node

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "dist/index.js"]
