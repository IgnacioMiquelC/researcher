# API Package

The API service for the Researcher application. Provides REST endpoints for managing research jobs.

## Overview

This is an Express.js API that allows clients to:
- Create research jobs
- Retrieve job status and results
- Check service health

The API integrates with the job queue (Redis) and job store (PostgreSQL) to manage asynchronous research processing.

## Project Structure

```
src/
├── app.ts                    # Express app setup and middleware configuration
├── server.ts                 # Server startup and port/hostname configuration
├── config/
│   └── server.ts             # Environment variable configuration
├── controllers/
│   └── birdController.ts     # Business logic for bird research operations
├── middleware/
│   ├── errorHandler.ts       # Global error handling middleware
│   └── validate.ts           # Request validation middleware (Zod schemas)
├── routers/
│   ├── health.ts             # Health check endpoint
│   └── v1/
│       ├── bird.ts           # Bird research endpoints
│       └── index.ts          # V1 router aggregator
└── __tests__/                # Test files and test utilities
```

## Installation

Install dependencies:

```bash
npm install
```

## Environment Setup

Create a `.env` file in the `packages/api/` directory. See `.env.example` for required variables:

```bash
PORT=3200
HOSTNAME=localhost
```

## Running the Application

### Development Mode

With hot-reload using `tsx`:

```bash
npm run dev
```

The server will start at `http://localhost:3200`

### Build

Compile TypeScript to JavaScript:

```bash
npm run build
```

## API Endpoints

### Health Check

```
GET /health
```

Returns service health status.

**Response (200):**
```
Service is healthy.
```

### Create Bird Research Job

```
POST /api/v1/bird
Content-Type: application/json

{
  "name": "sparrow"
}
```

Creates a new bird research job and queues it for processing.

**Response (201):**
```json
{
  "message": "Bird job for sparrow has been created and queued for processing.",
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200 - Already queued):**
```json
{
  "message": "Research job for sparrow is already queued, being processed or finished.",
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (400 - Invalid request):**
```json
{
  "error": "Validation error",
  "details": [
    {
      "path": "name",
      "message": "Expected string, received number"
    }
  ]
}
```

### Get Job Status

```
GET /api/v1/bird?name=sparrow
```

Retrieves the status and result of a bird research job.

**Response (202 - Still processing):**
```json
{
  "message": "Job with name: sparrow is still being processed.",
  "status": "queued",
  "jobId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200 - Completed):**
```json
{
  "message": "Job with name: sparrow has been completed.",
  "status": "completed",
  "result": {
    "species": "House Sparrow",
    "count": 42,
    "location": "Central Park"
  }
}
```

**Response (400 - Failed):**
```json
{
  "message": "Job with name: sparrow failed.",
  "status": "failed",
  "error": "Unable to locate research data for sparrow"
}
```

**Response (404 - Not found):**
```json
{
  "message": "No job found for name: sparrow"
}
```

## Development Workflow

### Making Changes

1. Edit files in `src/`
2. TypeScript is configured for strict mode
3. Changes are automatically type-checked

### Dependencies

- **express** - Web framework
- **zod** - TypeScript-first schema validation
- **research-jobs** - Job queue and store clients (local monorepo package)
- **researcher-sdk** - Shared types and schemas (local monorepo package)

### Dev Dependencies

- **vitest** - Test runner
- **supertest** - HTTP testing library
- **typescript** - Type checking
- **tsx** - TypeScript executor (hot-reload development)

## Error Handling

The API implements comprehensive error handling:

- **400 Bad Request** - Invalid request body or missing parameters (validation errors)
- **404 Not Found** - Job not found in database
- **500 Internal Server Error** - Database or queue failures

All errors are logged to console with full stack traces for debugging.

## TypeScript

The project uses strict TypeScript configuration:

```bash
npm run build
```

Ensure all changes pass type checking before deploying.

## Integration with Other Packages

This package depends on:

- **researcher-sdk** - Provides request/response schema definitions
- **research-jobs** - Provides `QueueClient` and `JobStoreClient` for Redis and database operations

These are referenced as local monorepo packages in `package.json`.

## Troubleshooting

### Port already in use

Change `PORT` in `.env` or environment:

```bash
PORT=3201 npm run dev
```

### Type errors during build

Check that all imports are correct and dependencies are installed:

```bash
npm run build
```

## Scripts

- `npm run dev` - Start development server with hot-reload
- `npm run build` - Compile TypeScript to JavaScript
