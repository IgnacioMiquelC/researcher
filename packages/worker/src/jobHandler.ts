import type { JobPayload, JobHandler } from 'research-jobs/job-queue/types';
import { JobStoreClient } from 'research-jobs/job-store/client';
import { BirdResearcher } from './research/birdResearch.ts';

/**
 * Job handler - processes jobs from the queue
 * 
 * Flow:
 * 1. Validate job payload
 * 2. Update job status to 'processing'
 * 3. Call BirdResearcher to fetch Wikipedia data
 * 4. On success: update status to 'completed' with result
 * 5. On error: update status to 'failed' with error, then throw for BullMQ retry
 */
export const jobHandler: JobHandler = async (
  jobId: string,
  jobData: JobPayload
): Promise<unknown> => {
  const jobStore = new JobStoreClient();

  try {
    console.log(`[Job ${jobId}] Processing job for bird: ${jobData.name}`);

    // Update job status to 'processing'
    await jobStore.updateJobStatus(jobId, 'processing');

    // Create researcher and fetch data
    const researcher = new BirdResearcher();
    const result = await researcher.research(jobData.name);

    // Update job with result
    await jobStore.updateJobStatus(jobId, 'completed', {
      result: { data: result },
    });

    console.log(`[Job ${jobId}] Job completed successfully`);
    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error during research';

    console.error(`[Job ${jobId}] Job failed: ${errorMessage}`);

    // Update job status to 'failed'
    await jobStore.updateJobStatus(jobId, 'failed', {
      error: errorMessage,
    });

    // Throw so BullMQ will handle retry logic
    throw error;
  }
};
