import { closeDatabase } from 'research-jobs/job-store/db';
import { WorkerClient } from './workerClient.ts';
import { jobHandler } from './jobHandler.ts';

/**
 * Worker entrypoint
 * 
 * Reads WORKER_CONCURRENCY from environment (default: 5)
 * Starts that many concurrent job processors
 * Handles graceful shutdown on SIGTERM/SIGINT
 */
async function start(): Promise<void> {
  const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);

  console.log(`Starting worker with concurrency: ${concurrency}`);
  console.log(`Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`);
  console.log(`Database: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);

  const worker = new WorkerClient(jobHandler);

  // Start workers
  await worker.start(concurrency);

  // Graceful shutdown handlers
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down gracefully...`);
    try {
      await worker.stop();
      await closeDatabase();
      console.log('Shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((error) => {
  console.error('Failed to start worker:', error);
  process.exit(1);
});
