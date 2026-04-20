# Multi-stage build for API service

# Stage 1: Builder
FROM node:alpine AS builder

WORKDIR /app

# Copy root files needed for workspaces
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy shared library package
COPY packages/shared/researcher-sdk ./packages/shared/researcher-sdk
COPY packages/shared/research-jobs ./packages/shared/research-jobs

# Copy API package
COPY packages/api ./packages/api

# Install all dependencies (including devDependencies)
RUN npm install

# Build shared library
RUN npm run build --workspace=packages/shared/researcher-sdk
RUN npm run build --workspace=packages/shared/research-jobs

# Build API
RUN npm run build --workspace=packages/api

# Stage 2: Runtime
FROM node:alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy package files
COPY package*.json ./
COPY --from=builder /app/packages/shared/researcher-sdk/package*.json ./packages/shared/researcher-sdk/
COPY --from=builder /app/packages/shared/research-jobs/package*.json ./packages/shared/research-jobs/
COPY --from=builder /app/packages/api/package*.json ./packages/api/

# Install production dependencies only
RUN npm install --omit=dev

# Copy compiled shared library
COPY --from=builder /app/packages/shared/researcher-sdk/dist ./packages/shared/researcher-sdk/dist
COPY --from=builder /app/packages/shared/research-jobs/dist ./packages/shared/research-jobs/dist

# Copy compiled API
COPY --from=builder /app/packages/api/dist ./packages/api/dist

WORKDIR /app/packages/api

EXPOSE 3200

CMD ["node", "dist/server.js"]
