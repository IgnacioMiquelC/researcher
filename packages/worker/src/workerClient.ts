import { Queue, Worker, Job } from 'bullmq';
import { getRedisConfig } from 'research-jobs/job-queue/redis';
import type { JobPayload, JobHandler } from 'research-jobs/job-queue/types';
import { QUEUE_NAME, getQueue } from 'research-jobs/job-queue/client';

/**
 * WorkerClient factory - Creates workers to consume jobs
 * Spawns multiple concurrent workers that pull jobs from the queue
 */
export class WorkerClient {
  private workers: Worker<JobPayload>[] = [];
  private queue: Queue<JobPayload>;

  constructor(private jobHandler: JobHandler) {
    this.queue = getQueue(getRedisConfig());
  }

  /**
   * Start concurrency number of workers
   */
  async start(concurrency: number): Promise<void> {
    for (let i = 0; i < concurrency; i++) {
      const worker = new Worker<JobPayload>(
        QUEUE_NAME,
        async (job: Job<JobPayload>) => {
          // Call the handler with job ID and data
          return this.jobHandler(job.id!, job.data);
        },
        {
          connection: getRedisConfig(),
          concurrency: 1, // Each worker processes one job at a time
        }
      );

      // Log events
      worker.on('completed', (job: any) => {
        console.log(`Job ${job.id} completed`);
      });

      worker.on('failed', (job: any, err: any) => {
        console.error(`Job ${job?.id} failed: ${err.message}`);
      });

      this.workers.push(worker);
    }

    console.log(`Started ${concurrency} workers for queue "${QUEUE_NAME}"`);
  }

  /**
   * Stop all workers
   */
  async stop(): Promise<void> {
    for (const worker of this.workers) {
      await worker.close();
    }
    if (this.queue) {
      await this.queue.close();
    }
    console.log('All workers stopped');
  }
}
