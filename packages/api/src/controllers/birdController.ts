import type { Request, Response } from 'express';
import { QueueClient } from 'research-jobs/job-queue';
import { JobStoreClient } from 'research-jobs/job-store';
import type { Job } from 'research-jobs/job-store';
import type {
    PostBirdRequestBody,
    PostBirdResponseBody,
    GetBirdResponseBody,
    ErrorResponseBody,
} from 'researcher-sdk'


/**
 * BirdController - Handles bird research job operations
 * Manages job creation and status retrieval
 */
export class BirdController {
  private queueClient: QueueClient;
  private jobStore: JobStoreClient;

  constructor(queueClient?: QueueClient, jobStore?: JobStoreClient) {
    this.queueClient = queueClient || new QueueClient();
    this.jobStore = jobStore || new JobStoreClient();
  }

  /**
   * Create a new bird research job
   * Creates a job in the database and enqueues it for processing
   *
   * @param req - Express request with bird name in body
   * @param res - Express response
   * @returns JSON response with job creation status
   */
  async createBirdJob(
    req: Request<unknown, PostBirdResponseBody, PostBirdRequestBody>,
    res: Response<PostBirdResponseBody | ErrorResponseBody>
  ): Promise<void> {
    const { name } = req.body;

    const normalizedName = name?.trim().toLowerCase();

    try {
      console.log(`Creating bird job for: ${normalizedName}`);

      // Create job record in database
      const job = await this.jobStore.createJob(normalizedName);

      // Attempt to enqueue the job
      try {
        const queuedJob = await this.queueClient.add({ id: job.id, name: normalizedName });

        if (!queuedJob) {
          res.status(200).json({
            message: `Research job for ${normalizedName} is already queued, being processed or finished.`,
            id: job.id,
          });
          return;
        }

        res.status(201).json({
          message: `Bird job for ${normalizedName} has been created and queued for processing.`,
          id: job.id,
        });
      } catch (queueError) {
        // If enqueue fails, log the orphaned job and throw
        console.error(`Failed to enqueue job ${job.id} for ${normalizedName}: ${queueError}`);
        throw new Error(`Job created but failed to enqueue: ${queueError instanceof Error ? queueError.message : 'unknown error'}`);
      }
    } catch (error) {
      this.handleCreateJobError(error, name, res);
    }
  }

  /**
   * Retrieve bird research job status and result
   * Looks up job by name and returns current status and result if completed
   *
   * @param req - Express request with bird name in query parameters
   * @param res - Express response
   * @returns JSON response with job status and optional result/error
   */
  async getBirdJob(
    req: Request,
    res: Response<GetBirdResponseBody | ErrorResponseBody>
  ): Promise<void> {
    const name = req.query.name as string;
    
    if (!name) {
      res.status(400).json({
        message: "Query parameter 'name' is required",
      });
      return;
    }
    const normalizedName = name.trim().toLowerCase();
    
    try {
      console.log(`Retrieving job for: ${normalizedName}`);

      const job = await this.jobStore.getJobByName(normalizedName);

      if (!job) {
        res.status(404).json({
          message: `No job found for name: ${normalizedName}`,
        });
        return;
      }

      this.respondWithJobStatus(job, res);
    } catch (error) {
      this.handleGetJobError(error, normalizedName, res);
    }
  }

  /**
   * Handle errors during job creation
   * @private
   */
  private handleCreateJobError(
    error: unknown,
    name: string,
    res: Response<PostBirdResponseBody | ErrorResponseBody>
  ): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // If job already exists (UNIQUE constraint), return 200
    if (errorMessage.includes('already exists')) {
      res.status(200).json({
        message: `Research job for ${name} is already queued, being processed or finished.`,
      });
      return;
    }

    console.error(`Error creating job: ${errorMessage}`, error);
    res.status(500).json({
      message: `Failed to create job: ${errorMessage}`,
    });
  }

  /**
   * Handle errors during job retrieval
   * @private
   */
  private handleGetJobError(
    error: unknown,
    birdName: string,
    res: Response<GetBirdResponseBody | ErrorResponseBody>
  ): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error retrieving job: ${errorMessage}`, error);

    res.status(500).json({
      message: `Failed to retrieve job: ${errorMessage}`,
    });
  }

  /**
   * Send appropriate response based on job status
   * @private
   */
  private respondWithJobStatus(
    job: Job,
    res: Response<GetBirdResponseBody | ErrorResponseBody>
  ): void {
    if (job.status === 'completed') {
      res.status(200).json({
        message: `Job with name: ${job.name} has been completed.`,
        status: job.status,
        result: job.result,
      });
      return;
    }

    if (job.status === 'failed') {
      res.status(400).json({
        message: `Job with name: ${job.name} failed.`,
        status: job.status,
        error: job.error,
      });
      return;
    }

    // Job is still processing (queued or processing)
    res.status(404);
  }
}

/**
 * Create and export a singleton instance of BirdController
 */
export const birdController = new BirdController();
