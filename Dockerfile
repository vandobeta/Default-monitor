# ==========================================
# Stage 1: Base Image
# ==========================================
FROM node:22-bookworm-slim AS base
WORKDIR /app
# Install Python and build tools required for native modules (e.g., better-sqlite3)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# ==========================================
# Stage 2: Dependencies
# ==========================================
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# ==========================================
# Stage 3: Builder
# ==========================================
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build the Vite frontend
RUN npm run build

# ==========================================
# Stage 4: Production Runner
# ==========================================
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
# Set the database path to a persistent volume directory
ENV DB_PATH=/app/data/unlockpro.db

# Create data directory for SQLite persistence
RUN mkdir -p /app/data

# Copy built frontend assets
COPY --from=builder /app/dist ./dist
# Copy backend source and dependencies
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/server.ts ./

# Install production dependencies only, plus tsx to run the server
RUN npm ci --omit=dev && npm install tsx

EXPOSE 3000

# Start the application
CMD ["npx", "tsx", "server.ts"]
