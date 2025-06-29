# Cloud HTTP Service - Independent Docker Image
FROM node:lts-alpine3.21 AS base

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY next.config.js ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY pages/ ./pages/
COPY src/ ./src/
COPY public/ ./public/
COPY utils/ ./utils/

# Build the Next.js application
RUN npm run build

# Production stage
FROM node:lts-alpine3.21 AS production

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
COPY next.config.js ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/next.config.js ./

# Create necessary directories
RUN mkdir -p logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Expose port
EXPOSE 9110

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:9110/api/health || exit 1

# Start the application
CMD ["npm", "start"] 