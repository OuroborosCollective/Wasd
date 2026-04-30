FROM node:25-alpine AS base

# Stage 1: Install all dependencies (including devDependencies)
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Install only production dependencies
FROM base AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Stage 4: Production runner
FROM base AS runner
WORKDIR /app

# Set non-root environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy necessary files from build stages
COPY --from=builder /app/dist ./dist
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json ./

# Hardening: Use non-privileged user and restricted permissions
USER node

EXPOSE 3000

# Healthcheck for orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "dist/index.js"]