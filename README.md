# Researcher service
This project implements a web service that uses a job queue to handle research requests.

## Repository structure

```
researcher/
├── packages/
│   ├── api/                     # Express web service
│   ├── worker/                  # Job consumer process
│   └── shared/
│       ├── research-jobs/       # Facade for PostgreSQL, Redis and BullMQ
│       └── researcher-sdk/      # Schemas and client for Researcher API
├── compose.yml           # Redis + optional Prometheus/Grafana
├── tsconfig.base.json
└── package.json                 # Workspaces root
```

`api` and `worker` are separate processes (independent scaling, separate crash domains) but they share code.
`shared` holds everything both processes need: the JobStore and JobQueue wrappers and Zod schemas — so types are never copied or drifted.

## Quick Start

### Docker (Recommended)

The fastest way to run the entire system:

```bash
docker compose up -d     # Start PostgreSQL, Redis, API, and Worker
docker compose logs -f   # View logs
```

Then test it:

```bash
# Create a bird research job
curl -X POST "http://localhost:3200/api/v1/bird" \
  -H 'Content-Type: application/json' \
  -d '{"name": "brown pelican"}'

# Poll for results
curl "http://localhost:3200/api/v1/bird?name=brown%20pelican"
```

Cleanup: `docker compose down` (or `docker compose down -v` to reset the database).

### Local Development

Run services locally with Node.js, PostgreSQL, and Redis running on your machine:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start PostgreSQL and Redis** (on their default ports: 5432 and 6379)
   - macOS: `brew services start postgresql redis`
   - Linux: Use your package manager or Docker containers
   - Or use Docker for just these services: `docker compose up postgres redis -d`

3. **Configure environment** (create `.env` in each package):

   **packages/api/.env:**
   ```env
   PORT=3200
   HOSTNAME=localhost
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=postgres
   DB_NAME=research
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

   **packages/worker/.env:** (same database/Redis config)

4. **Initialize the database:**
   ```bash
   psql -U postgres -d research -f scripts/init-db.sql
   ```

5. **Run in separate terminals:**
   ```bash
   # Terminal 1: API server
   npm run dev --workspace=packages/api
   # Opens http://localhost:3200

   # Terminal 2: Worker
   npm run dev --workspace=packages/worker
   ```

## Features

This system demonstrates a production-ready job queue architecture:

- **API Service** (`packages/api`): Express server with type-safe request validation (Zod) and error handling
  - `POST /api/v1/bird` — Create a bird research job (idempotent by name)
  - `GET /api/v1/bird?name=...` — Check job status and retrieve results
  - `GET /health` — Health check endpoint

- **Worker Process** (`packages/worker`): Configurable concurrent job processor (default: 5 parallel jobs)
  - Fetches bird data from Wikipedia API
  - Automatically retries on failure
  - Respects job status transitions: queued → processing → completed/failed

- **Shared Packages**: Type-safe, DRY architecture across services
  - **research-jobs**: Unified JobStore (PostgreSQL + Kysely ORM) and JobQueue (BullMQ + Redis) facades
  - **researcher-sdk**: Zod schemas and TypeScript types shared by API and Worker

- **Data Persistence**: ACID transactions via PostgreSQL with unique job names for idempotency

- **Horizontal Scaling**: Easy to scale workers independently via Docker Compose or Kubernetes

## Persistence layer: PostgreSQL via pg and kysely

The job store is powered by **PostgreSQL** as the single source of truth for job state. This enables horizontal scaling, ACID transactions, and reliable idempotency guarantees.

### Why PostgreSQL?

- **ACID Transactions**: Job state changes are atomic; no partial updates
- **Idempotency**: `UNIQUE` constraint on normalized job name ensures duplicate requests return the same result
- **Queryability**: Full SQL support for complex queries (filtering by status, date ranges, etc.)
- **Scalability**: Horizontal read replicas for high-volume lookups; connection pooling handled by `pg` library

### Database Schema

```SQL
CREATE TYPE job_status AS ENUM ('queued', 'processing', 'completed', 'failed');

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,           -- Normalized name for idempotency
    status job_status NOT NULL DEFAULT 'queued',
    result JSONB,                        -- Job output (bird research data)
    error TEXT,                          -- Error message if job failed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_jobs_name ON jobs(name);       -- Quick lookups by name
CREATE INDEX idx_jobs_status ON jobs(status);   -- Filter by job status
CREATE INDEX idx_jobs_created_at ON jobs(created_at);  -- Sort/filter by creation time
```

### JobStore Client

The `research-jobs` package exports a **JobStore** facade that wraps PostgreSQL access:

```typescript
// packages/shared/research-jobs/src/job-store/index.ts
export interface JobStore {
  createOrUpdate(name: string, result?: unknown): Promise<Job>;
  getByName(name: string): Promise<Job | null>;
  updateStatus(id: string, status: JobStatus, result?: unknown, error?: string): Promise<Job>;
  listByStatus(status: JobStatus): Promise<Job[]>;
}
```

**Key methods**:
- `createOrUpdate()`: Idempotent job creation (INSERT ... ON CONFLICT UPDATE)
- `getByName()`: Retrieve job by normalized name
- `updateStatus()`: Transition job through states (queued → processing → completed/failed)
- `listByStatus()`: Query jobs by state (useful for monitoring/dashboards)

### Connection Pooling

The `pg` library manages a connection pool to PostgreSQL (default: 10 connections):

```env
# Environment configuration
DB_HOST=postgres              # PostgreSQL server hostname
DB_PORT=5432                  # PostgreSQL server port
DB_USER=postgres              # Database user
DB_PASSWORD=postgres          # Database password
DB_NAME=research              # Database name
```

The JobStore client is instantiated once per process and reused across all requests/jobs—connection pooling is automatic.

### Design Patterns

**Normalized job names**: Both API and Worker normalize job names to lowercase + trimmed:
```typescript
const normalizedName = name.toLowerCase().trim();
```
This ensures duplicate requests (even with different casing) return the same job record.

**Status transitions**: Jobs follow a state machine:
- `queued` → job created, awaiting worker pickup
- `processing` → worker is actively processing
- `completed` → job finished with result
- `failed` → job failed with error message

**Immutable history**: PostgreSQL `created_at` and `updated_at` timestamps provide audit trail; job records are never deleted.

## Job Queue layer: Redis via BullMQ

The job queue uses **BullMQ** (a Redis-based queue library) to decouple job creation from job processing, enabling scalable, asynchronous work distribution.

### How It Works

1. **API creates jobs**: When a request arrives at `POST /api/v1/bird`, the controller:
   - Inserts/updates the job record in PostgreSQL (for persistence and status tracking)
   - Adds a job to the BullMQ queue in Redis (for worker discovery)

2. **Workers process jobs**: Each `Worker` instance reads from the same Redis queue:
   - Picks up the next job from the queue
   - Processes it (e.g., fetches bird data from Wikipedia API)
   - Updates the job status in PostgreSQL (completed/failed)
   - Marks the job as processed in the queue

3. **Polling for results**: The API `GET /api/v1/bird?name=...` endpoint:
   - Reads job status from PostgreSQL
   - Returns the result if completed, or status if still processing

### Redis Configuration

Redis stores job metadata and state using BullMQ's internal data structures (hashes, lists, sorted sets). Key environment variables:

```env
REDIS_HOST=redis          # Redis server hostname
REDIS_PORT=6379           # Redis server port
REDIS_PASSWORD=            # Optional authentication
REDIS_DB=0                # Redis database number (default: 0)
```

### Scaling

BullMQ's queue is **distributed by design**—multiple worker instances can consume from the same Redis queue without coordination:

```bash
# Run 3 worker containers, each processing 5 jobs in parallel
docker compose up -d --scale worker=3
```

Result: 15 parallel job processors (3 containers × 5 concurrency) competing for jobs from the same queue. BullMQ ensures each job is processed exactly once.

### Reliability & Job Delivery

- **Job persistence**: Jobs are stored in both PostgreSQL (for history/queries) and Redis (for queue state)
- **At-least-once semantics**: If a worker crashes mid-job, BullMQ automatically re-queues it after a timeout
- **Job status tracking**: PostgreSQL maintains the single source of truth for job state transitions
- **Loss prevention**: Data survives pod/container restarts; only in-flight jobs may retry

## Web Service (packages/api)
```
src/
├── config/
│   └── server.ts             # Service configuration (environment vars)
├── controllers/
│   └── birdController.ts     # Controller for the bird endpoints
├── middleware/
│   ├── errorHandler.ts
│   └── validate.ts           # Zod schema middleware
├── routers/
│   ├── health.ts             # GET /health
│   └── v1/                   # Versioned endpoints
│       └── index.ts
│       └── bird.ts           # POST /bird, GET /bird
├── app.ts                    # Express app declaration
└── server.ts                 # Entrypoint
```

## Worker Process (packages/worker)
`worker.ts` reads `WORKER_CONCURRENCY` from env (default: `5`) and creates that many BullMQ `Worker` instances pointing at the same queue. BullMQ manages job dispatch; each worker processes one job at a time.

## Docker Setup

### Quick Start

```bash
# Start all services (PostgreSQL, Redis, API, Worker)
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

### Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| **postgres** | postgres:alpine | 5432 | PostgreSQL database (jobs table, auto-initialized) |
| **redis** | redis:alpine | 6379 | BullMQ queue backend |
| **api** | node:alpine (multi-stage) | 3200 | Express HTTP API |
| **worker** | node:alpine (multi-stage) | (internal) | Job consumer process |

### Configuration

Edit `.env.docker` to customize:

```env
# API server
PORT=3200
HOSTNAME=0.0.0.0

# PostgreSQL
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=research

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Worker concurrency
WORKER_CONCURRENCY=5
```

Then reference it when starting:

```bash
docker compose --env-file .env.docker up -d
```

### Database Initialization

PostgreSQL automatically initializes on first start:
1. Creates `job_status` ENUM type
2. Creates `jobs` table with indexes
3. Script: `scripts/init-db.sql` (mounted at `/docker-entrypoint-initdb.d/`)

To reset the database:

```bash
docker compose down -v  # -v removes volumes
docker compose up -d
```

### Testing End-to-End

1. **Start services:**
   ```bash
   docker compose up -d
   ```

2. **Create a research job:**
   ```bash
   curl -X POST "http://localhost:3200/api/v1/bird" \
      -H 'Content-Type: application/json' \
      -d '{"name": "brown pelican"}
   ```

3. **Poll for completion:**
   ```bash
   curl "http://localhost:3200/api/v1/bird?name=brown%20pelican"
   ```

### Scaling

To run multiple worker instances (for concurrency testing):

```bash
docker compose up -d --scale worker=3
```

Note: Each worker container processes `WORKER_CONCURRENCY` jobs in parallel. With 3 containers at concurrency=5, you get 15 parallel job processors.

### Cleanup

```bash
# Stop containers but keep volumes (database persists)
docker compose stop

# Stop and remove everything including volumes
docker compose down -v

# Rebuild images after code changes
docker compose build

# Rebuild and restart
docker compose up -d --build
```

## Future Roadmap

With more development time, these improvements would strengthen the system:

### Extensibility
- **Decouple research type**: Make the api service have a dynamic endpoint to accept more research subjects, not just bird research
- **Researcher library**: Move the researcher abstraction from the worker package to a researcher-core package to be able to implement more researcher classes, like the BirdResearcher

### Testing & Reliability
- **API tests**: Unit and integration tests for `packages/api` to verify controller functionality, error handling and input validation
- **Worker tests**: Unit and integration tests for `packages/worker` to verify job processing and error handling
- **Shared package tests**: Test coverage for `packages/shared/research-jobs` and `packages/researcher-sdk`
- **Error recovery**: Implement exponential backoff and configurable retry policies for failed jobs

### Observability
- **Request logging middleware**: Complete the `requestLogger` middleware to track API calls
- **Distributed tracing**: Add OpenTelemetry for end-to-end request tracing across API and Worker
- **Health checks**: Extend `/health` endpoint to report database and Redis connectivity
- **Webhook callbacks**: Notify external systems when jobs complete

### Infrastructure & DevOps
- **Environment-specific configs**: Separate dev/staging/prod configurations
- **Rate limiting**: Protect API from abuse with token bucket or sliding window rate limiters
- **Authentication & authorization**: Add API key, JWT-based auth or OAuth
