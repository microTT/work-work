# Simple DDNS Tool
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files and install all dependencies
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci

# Copy source code and config
COPY src/ ./src/
COPY utils/ ./utils/
COPY config.ts ./

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application and config
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/utils ./utils
COPY config.ts ./

# Copy environment files
COPY .env .env.local ./

# Create directories
RUN mkdir -p logs cache

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S ddns -u 1001 -G nodejs

# Change ownership
RUN chown -R ddns:nodejs /app
USER ddns

# Expose port
EXPOSE 9910

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:9910/health || exit 1

# Start
CMD ["npm", "start"] 