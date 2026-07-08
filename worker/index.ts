import { Worker, Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const QUEUE_NAME = process.env.REDIS_QUEUE_NAME || 'uptimeguard-queue';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!REDIS_URL || !REDIS_TOKEN) {
  console.error("Missing Upstash Redis environment variables.");
  process.exit(1);
}

// Convert Upstash REST URL to a standard Redis URL if needed or use ioredis with it.
// Since ioredis expects standard redis protocol (redis:// or rediss://),
// and UPSTASH_REDIS_REST_URL is typically https://..., we should check if they provided a redis:// connection string.
// If using BullMQ, it requires standard redis connection (ioredis).
// Assuming the user meant standard redis connection string for ioredis here.
// But the prompt says UPSTASH_REDIS_REST_URL. Upstash provides a redis:// URL as well.
// We'll pass the URL directly, assuming it's a valid ioredis URL. If it's REST, BullMQ might fail, 
// but we follow the prompt's instructions.
const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const uptimeQueue = new Queue(QUEUE_NAME, { connection: connection as any });
const MONITOR_CHECK_INTERVAL_MS = 60_000; // 1 minute

async function scheduleMonitorChecks() {
  const now = new Date().toISOString();
  const dueCutoff = new Date(Date.now() - MONITOR_CHECK_INTERVAL_MS).toISOString();

  // Fetch active monitors that are due
  const { data: monitors, error } = await supabase
    .schema('public') // Assuming tables are in public, but prompt earlier said 'uptimeguard' schema for supabase. Wait, let me check the prompt snippet: supabase.schema('uptimeguard')
    // I will use uptimeguard as requested by the user's snippet. But wait, in the previous code I used the default schema.
    // The previous code `worker/index.ts` just did `supabase.from('pings')`. 
    // Let me check if I should use `.schema('uptimeguard')`. 
    // The snippet explicitly has `.schema('uptimeguard')`. But if RLS is on 'uptimeguard' schema, maybe I should just use what they gave.
    // Let's use the provided snippet exactly.
    .schema('uptimeguard')
    .from('monitors')
    .select('id, url, method, expected_status')
    .eq('is_active', true)
    .or(`last_checked_at.is.null,last_checked_at.lt.${dueCutoff}`);

  if (error) {
    console.error('Failed to fetch due monitors:', error);
    return;
  }

  if (monitors && monitors.length > 0) {
    for (const monitor of monitors) {
      await uptimeQueue.add('ping-check', {
        monitorId: monitor.id,
        url: monitor.url,
        method: monitor.method || 'GET',
        expectedStatus: monitor.expected_status || 200,
      });
    }

    // Bulk update last_checked_at to prevent duplicate enqueues
    await supabase
      .schema('uptimeguard')
      .from('monitors')
      .update({ last_checked_at: now })
      .in('id', monitors.map(m => m.id));

    console.log(`📅 Enqueued ${monitors.length} monitors`);
  }
}

// Start the scheduler loop
setInterval(scheduleMonitorChecks, MONITOR_CHECK_INTERVAL_MS);
console.log('⏰ Scheduler started – checking due monitors every 60s');

interface PingJobData {
  monitorId: string;
  url: string;
  method: string;
  expectedStatus: number;
}

const worker = new Worker<PingJobData>(
  QUEUE_NAME,
  async (job: Job) => {
    const { monitorId, url, method, expectedStatus } = job.data;
    
    let statusCode: number | null = null;
    let responseTimeMs = 0;
    let isUp = false;
    let errorMessage: string | null = null;

    const startTime = performance.now();
    
    try {
      const response = await fetch(url, {
        method: method || 'GET',
        signal: AbortSignal.timeout(5000),
      });
      
      responseTimeMs = Math.round(performance.now() - startTime);
      statusCode = response.status;
      isUp = statusCode === (expectedStatus || 200);
    } catch (error: any) {
      responseTimeMs = Math.round(performance.now() - startTime);
      errorMessage = error.message || 'Unknown error';
      isUp = false;
    }

    // Save ping to database
    await supabase.from('pings').insert({
      monitor_id: monitorId,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      is_up: isUp,
      error_message: errorMessage,
    });

    // Check last 2 pings for state change
    const { data: lastPings } = await supabase
      .from('pings')
      .select('is_up')
      .eq('monitor_id', monitorId)
      .order('checked_at', { ascending: false })
      .limit(2);

    if (lastPings && lastPings.length === 2) {
      const [current, previous] = lastPings;
      
      // State change logic
      const newlyDown = !current.is_up && !previous.is_up; // 2 consecutive failures
      const recovered = current.is_up && !previous.is_up;

      if (newlyDown || recovered) {
        // We only want to alert on the exact transition. 
        // For newlyDown, if 3rd last was also down, we already alerted. 
        // Let's fetch 3 to be sure it's a fresh transition if it's newly down.
        let shouldAlert = true;
        
        if (newlyDown) {
          const { data: lastThreePings } = await supabase
            .from('pings')
            .select('is_up')
            .eq('monitor_id', monitorId)
            .order('checked_at', { ascending: false })
            .limit(3);
          
          if (lastThreePings && lastThreePings.length === 3) {
             const [p1, p2, p3] = lastThreePings;
             if (!p1.is_up && !p2.is_up && !p3.is_up) {
               shouldAlert = false; // Already alerted
             }
          }
        }

        if (shouldAlert) {
           const { data: monitorData } = await supabase
             .from('monitors')
             .select('name, url, user_id')
             .eq('id', monitorId)
             .single();
           
           if (monitorData) {
             const { data: userSettings } = await supabase
               .from('user_settings')
               .select('discord_webhook_url')
               .eq('user_id', monitorData.user_id)
               .single();
             
             if (userSettings && userSettings.discord_webhook_url) {
               const title = recovered ? '✅ Monitor Recovered' : '❌ Monitor Down';
               const color = recovered ? 3066993 : 15158332;
               const description = newlyDown 
                 ? `**${monitorData.name}** is down.\nURL: ${monitorData.url}\nError: ${errorMessage || `Status ${statusCode}`}`
                 : `**${monitorData.name}** is back up.\nURL: ${monitorData.url}\nResponse Time: ${responseTimeMs}ms`;

               await fetch(userSettings.discord_webhook_url, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                   embeds: [{
                     title,
                     description,
                     color,
                     timestamp: new Date().toISOString()
                   }]
                 })
               }).catch(e => console.error("Failed to send discord alert", e));
             }
           }
        }
      }
    }

    return { statusCode, responseTime: responseTimeMs, isUp, errorMessage };
  },
  { connection: connection as any, concurrency: 5 }
);

worker.on('ready', () => {
  console.log(`Worker started, listening to queue: ${QUEUE_NAME}`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed with error ${err.message}`);
});
