# Multi-stage build for Worker service

# Stage 1: Builder
FROM node:alpine AS builder

WORKDIR /app

# Copy root files needed for workspaces
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy shared library package
COPY packages/shared/research-jobs ./packages/shared/research-jobs

# Copy worker package
COPY packages/worker ./packages/worker

# Install all dependencies (including devDependencies)
RUN npm install

# Build shared library
RUN npm run build --workspace=packages/shared/research-jobs


# Build worker
RUN npm run build --workspace=packages/worker

# Stage 2: Runtime
FROM node:alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy package files
COPY package*.json ./
COPY --from=builder /app/packages/shared/research-jobs/package*.json ./packages/shared/research-jobs/
COPY --from=builder /app/packages/worker/package*.json ./packages/worker/

# Install production dependencies only
RUN npm install --omit=dev

# Copy compiled shared library
COPY --from=builder /app/packages/shared/research-jobs/dist ./packages/shared/research-jobs/dist

# Copy compiled worker
COPY --from=builder /app/packages/worker/dist ./packages/worker/dist

WORKDIR /app/packages/worker

CMD ["node", "dist/worker.js"]
