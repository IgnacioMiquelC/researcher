// Job payload type
export interface JobPayload {
  id: string; // UUID from PostgreSQL
  name: string;
}

// Job handler type
export type JobHandler = (jobId: string, data: JobPayload) => Promise<unknown>;
