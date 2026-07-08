import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enqueueMonitorCheck } from '@/lib/queue/producer'

// Use a service role key to bypass RLS since cron runs unauthenticated
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(request: Request) {
  // Optional: Add basic auth or secret header check to prevent public execution
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = createServiceClient()
  
  // Find monitors where last_checked_at is null or older than their interval
  // For simplicity, as per prompt, we just query active monitors that are null or older than 5 minutes.
  // We can refine this using check_interval_seconds if needed.
  // Prompt says: "older than 5 minutes (use Date.now() - 300000)"
  const fiveMinutesAgo = new Date(Date.now() - 300000).toISOString()

  const { data: monitors, error } = await supabase
    .from('monitors')
    .select('*')
    .eq('is_active', true)
    .or(`last_checked_at.is.null,last_checked_at.lt.${fiveMinutesAgo}`)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!monitors || monitors.length === 0) {
    return NextResponse.json({ enqueued: 0 })
  }

  let enqueued = 0;
  const monitorIds = [];

  for (const monitor of monitors) {
    try {
      await enqueueMonitorCheck(
        monitor.id,
        monitor.url,
        monitor.method,
        monitor.expected_status
      )
      enqueued++;
      monitorIds.push(monitor.id);
    } catch (e) {
      console.error(`Failed to enqueue monitor ${monitor.id}`, e)
    }
  }

  if (monitorIds.length > 0) {
    await supabase
      .from('monitors')
      .update({ last_checked_at: new Date().toISOString() })
      .in('id', monitorIds)
  }

  return NextResponse.json({ enqueued })
}
