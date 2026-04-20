import { getDatabase, type Job } from './db.ts';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

/**
 * JobStoreClient - Facade for database operations on jobs
 * Provides a clean interface for workers and the API to interact with job data
 */
export class JobStoreClient {
  constructor(private db = getDatabase()) {}

  /**
   * Create a new job with 'queued' status
   * Throws if job with same name already exists (UNIQUE constraint violation)
   */
  async createJob(name: string): Promise<Job> {
    try {
      const job = await this.db
        .insertInto('jobs')
        .values({
          name,
          status: 'queued',
          result: null,
          error: null,
        } as any)
        .returningAll()
        .executeTakeFirstOrThrow();
      return this.mapJobRecord(job);
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate key')) {
        throw new Error(`Job with name "${name}" already exists`);
      }
      throw error;
    }
  }

  /**
   * Get a job by its name
   */
  async getJobByName(name: string): Promise<Job | null> {
    const job = await this.db
      .selectFrom('jobs')
      .selectAll()
      .where('name', '=', name)
      .executeTakeFirst();

    return job ? this.mapJobRecord(job) : null;
  }

  /**
   * Get a job by its ID
   */
  async getJobById(id: string): Promise<Job | null> {
    const job = await this.db
      .selectFrom('jobs')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    return job ? this.mapJobRecord(job) : null;
  }

  /**
   * Update job status and optionally result/error, updating updated_at timestamp
   */
  async updateJobStatus(
    jobId: string,
    status: JobStatus,
    data?: { result?: Record<string, unknown>; error?: string }
  ): Promise<void> {
    const updates: Partial<{
      status: JobStatus;
      result: Record<string, unknown> | null;
      error: string | null;
      updated_at: Date;
    }> = {
      status,
      updated_at: new Date(),
    };

    if (data?.result !== undefined) {
      updates.result = data.result;
    }

    if (data?.error !== undefined) {
      updates.error = data.error;
    }

    await this.db
      .updateTable('jobs')
      .set(updates)
      .where('id', '=', jobId)
      .execute();
  }

  /**
   * Update job result
   */
  async updateJobResult(jobId: string, result: Record<string, unknown>): Promise<void> {
    await this.db
      .updateTable('jobs')
      .set({
        result,
        updated_at: new Date(),
      })
      .where('id', '=', jobId)
      .execute();
  }

  /**
   * Update job error
   */
  async updateJobError(jobId: string, error: string): Promise<void> {
    await this.db
      .updateTable('jobs')
      .set({
        error,
        updated_at: new Date(),
      })
      .where('id', '=', jobId)
      .execute();
  }

  /**
   * Get all jobs with a specific status
   */
  async getJobsByStatus(status: JobStatus): Promise<Job[]> {
    const jobs = await this.db
      .selectFrom('jobs')
      .selectAll()
      .where('status', '=', status)
      .orderBy('created_at', 'asc')
      .execute();

    return jobs.map((job: any) => this.mapJobRecord(job));
  }

  /**
   * Map database record to Job interface (handle type conversions)
   */
  private mapJobRecord(record: any): Job {
    return {
      id: record.id,
      name: record.name,
      status: record.status as JobStatus,
      result: record.result as Record<string, unknown> | null,
      error: record.error,
      created_at: record.created_at,
      updated_at: record.updated_at,
    };
  }
}
