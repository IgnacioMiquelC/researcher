import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

/**
 * Database schema for jobs table
 */
export interface JobsTable {
  id: string; // UUID
  name: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  result: Record<string, unknown> | null;
  error: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Full database schema
 */
export interface Database {
  jobs: JobsTable;
}

/**
 * Job type for external use
 */
export interface Job {
  id: string;
  name: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  result: Record<string, unknown> | null;
  error: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * PostgreSQL connection configuration
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}

/**
 * Get database configuration from environment variables
 */
function getDatabaseConfig(): DatabaseConfig {
  const config: DatabaseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    database: process.env.DB_NAME || 'research',
  };
  
  if (process.env.DB_PASSWORD) {
    config.password = process.env.DB_PASSWORD;
  }
  
  return config;
}

// Singleton database instance
let dbInstance: Kysely<Database> | null = null;

/**
 * Get or create the database connection
 */
export function getDatabase(): Kysely<Database> {
  if (!dbInstance) {
    const config = getDatabaseConfig();

    const pool = new Pool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      max: 10, // Connection pool size
    });

    dbInstance = new Kysely<Database>({
      dialect: new PostgresDialect({
        pool,
      }),
    });
  }

  return dbInstance;
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.destroy();
    dbInstance = null;
  }
}
