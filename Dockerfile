# Multi-stage Dockerfile for LinguaMaster - Production-Ready
# Optimized for Google Cloud Run deployment

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies only when needed
COPY package.json package-lock.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./

# Install all dependencies (including dev) for building
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Stage 3: Runner (Production)
FROM node:20-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S linguamaster -u 1001

# Copy only production dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy database migrations and scripts
COPY --from=builder /app/db ./db

# Set ownership to non-root user
RUN chown -R linguamaster:nodejs /app

# Switch to non-root user
USER linguamaster

# Expose port (Cloud Run uses PORT env var)
EXPOSE 8080

# Health check for Cloud Run
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "const http=require('http');const req=http.get('http://localhost:8080/api/health',(res)=>{process.exit(res.statusCode===200?0:1);});req.on('error',()=>{process.exit(1);});req.setTimeout(3000,()=>{req.destroy();process.exit(1);});"

# Start application
CMD ["node", "dist/index.js"]
