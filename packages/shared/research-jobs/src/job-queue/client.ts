import { Queue, Job } from 'bullmq';
import { getRedisConfig, type RedisConfig } from './redis.ts';
import type { JobPayload } from './types.ts';

export const QUEUE_NAME = 'bird-research';

// Singleton queue instance
let queueInstance: Queue<JobPayload> | null = null;

/**
 * Get or create the queue instance
 * @param redisConfig - Redis configuration for connecting to the queue
 * @return Queue instance for enqueuing jobs
 */
export function getQueue(redisConfig: RedisConfig): Queue<JobPayload> {
  if (!queueInstance) {
    queueInstance = new Queue<JobPayload>(QUEUE_NAME, {
      connection: {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db,
      },
    });
  }
  return queueInstance;
}

/**
 * QueueClient - Used by API to enqueue jobs
 * Enqueues jobs with a unique name and uses the UUID from PostgreSQL as the job ID for consistency.
 * Returns the job if enqueued successfully, or null if a job with the same name already exists (idempotent).
 */
export class QueueClient {
  private queue: Queue<JobPayload>;

  constructor() {
    this.queue = getQueue(getRedisConfig());
  }

  /**
   * Enqueue a job. Returns the job or null if it already exists (idempotent).
   * Uses jobId (UUID) as the primary uniqueness key to prevent duplicates.
   * @return Job instance if enqueued successfully, or null if a job with the same name/id already exists
   */
  async add(jobData: JobPayload): Promise<Job<JobPayload> | null> {
    try {
      // Validate job payload
      if (!jobData.id) {
        throw new Error('Job payload must include id (UUID from PostgreSQL)');
      }

      // Check if job with this ID already exists in queue
      const existingById = await this.queue.getJob(jobData.id);
      if (existingById) {
        console.log(`Job with ID ${jobData.id} (${jobData.name}) already exists in queue.`);
        return null;
      }

      // Try to find existing job by name as secondary check
      const existingJobs = await this.queue.getJobs(['waiting', 'active', 'delayed']);
      const existingByName = existingJobs.find((job: Job<JobPayload>) => job.data.name === jobData.name);
      if (existingByName) {
        console.log(`Job for ${jobData.name} already exists in queue.`);
        return null;
      }

      // Create new job with UUID as the jobId for consistency with PostgreSQL
      const job = await this.queue.add(jobData.name, jobData, {
        jobId: jobData.id, // Use UUID as primary key
        removeOnComplete: false,
        removeOnFail: false,
      });

      return job;
    } catch (error) {
      // Handle BullMQ errors for duplicate job IDs
      if (error instanceof Error) {
        if (error.message.includes('NOSCRIPT') || error.message.includes('ERR WRONGTYPE')) {
          return null;
        }
      }
      throw error;
    }
  }

  /**
   * Get job by name
   */
  async getJobByName(name: string): Promise<Job<JobPayload> | null> {
    const job = await this.queue.getJob(name);
    return job || null;
  }

  /**
   * Close the queue connection
   */
  async close(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
    }
  }
}
