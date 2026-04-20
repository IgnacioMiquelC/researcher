// Redis connection configuration
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

/**
 * Get Redis config from environment variables
 */
export function getRedisConfig(): RedisConfig {
  const config: RedisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  };
  
  if (process.env.REDIS_PASSWORD) {
    config.password = process.env.REDIS_PASSWORD;
  }
  
  if (process.env.REDIS_DB) {
    config.db = parseInt(process.env.REDIS_DB, 10);
  }
  
  return config;
}
