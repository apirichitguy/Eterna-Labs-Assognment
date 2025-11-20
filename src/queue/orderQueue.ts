import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Support both REDIS_URL (Railway) and separate REDIS_HOST/REDIS_PORT (local)
const connection = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : new IORedis({
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379),
    maxRetriesPerRequest: null
  });

export { connection as queueConnection };

export const orderQueue = new Queue('orders', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 500 }
  }
});
