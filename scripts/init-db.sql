-- Create job_status enum type
CREATE TYPE job_status AS ENUM ('queued', 'processing', 'completed', 'failed');

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  status job_status NOT NULL DEFAULT 'queued',
  result TEXT,
  error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on name for fast lookups
CREATE INDEX IF NOT EXISTS idx_jobs_name ON jobs(name);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
