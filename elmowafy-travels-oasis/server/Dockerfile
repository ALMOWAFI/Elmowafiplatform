# Stage 1: Build
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./
COPY .npmrc ./

# Install all dependencies including devDependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application (if needed)
# RUN npm run build

# Remove devDependencies
RUN npm prune --production

# Stage 2: Production
FROM node:18-alpine

# Install runtime dependencies
RUN apk add --no-cache tini

# Create app directory
WORKDIR /usr/src/app

# Copy built application from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/index.js ./
COPY --from=builder /usr/src/app/routes ./routes
COPY --from=builder /usr/src/app/models ./models
COPY --from=builder /usr/src/app/middleware ./middleware
COPY --from=builder /usr/src/app/config ./config
COPY --from=builder /usr/src/app/logs ./logs

# Create a non-root user and set permissions
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /usr/src/app

# Switch to non-root user
USER appuser

# Environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV NODE_OPTIONS=--max_old_space_size=2048

# Create logs directory with write permissions
RUN mkdir -p /usr/src/app/logs \
    && chown -R appuser:appgroup /usr/src/app/logs \
    && chmod -R 755 /usr/src/app/logs

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Expose the port the app runs on
EXPOSE 5000

# Use tini as init process for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Command to run the application
CMD ["node", "index.js"]
