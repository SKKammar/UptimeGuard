import { Queue } from 'bullmq';
import Redis from 'ioredis';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const QUEUE_NAME = process.env.REDIS_QUEUE_NAME || 'uptimeguard-queue';

// Using ioredis connection
const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const monitorQueue = new Queue(QUEUE_NAME, { connection: connection as any });

export async function enqueueMonitorCheck(
  monitorId: string,
  url: string,
  method: string,
  expectedStatus: number
) {
  await monitorQueue.add(
    'ping-check',
    { monitorId, url, method, expectedStatus },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
    }
  );
}
