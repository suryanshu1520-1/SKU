# Multi-stage build: optimized for layer caching and minimal runtime size
# Stage 1: Builder
FROM node:22-alpine AS builder

WORKDIR /build

# Copy lockfile FIRST for dependency caching
COPY package-lock.json package.json ./

# Install dependencies with frozen lockfile (production-like)
RUN npm ci --prefer-offline --no-audit

# Copy entire source tree
COPY . .

# TypeScript type-check both web and API
RUN npm run lint

# Build Vite frontend + esbuild backend bundle
RUN npm run build

# Stage 2: Runtime (production-optimized)
FROM node:22-alpine

WORKDIR /app

# Environment defaults (override at runtime with -e or env_file)
ENV NODE_ENV=production
ENV PORT=3000

# Copy minimal runtime deps from builder
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/dist ./dist
COPY --from=builder /build/package.json ./package.json

# Health check: verify server is responsive
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose port (informational; override in compose if needed)
EXPOSE 3000

# Start production server
CMD ["node", "dist/server.cjs"]
