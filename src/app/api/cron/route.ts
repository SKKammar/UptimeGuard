import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Service‑role client (needed because this endpoint has no user session)
const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'uptimeguard' } }
);

export const dynamic = 'force-dynamic'; // Don't cache

async function pingUrl(url: string, method: string, expectedStatus: number) {
  const start = performance.now();
  try {
    const res = await fetch(url, {
      method,
      signal: AbortSignal.timeout(5000), // 5 seconds timeout
    });
    const duration = Math.round(performance.now() - start);
    return {
      statusCode: res.status,
      responseTime: duration,
      isUp: res.status === expectedStatus,
      errorMessage: null,
    };
  } catch (error: any) {
    const duration = Math.round(performance.now() - start);
    return {
      statusCode: null,
      responseTime: duration,
      isUp: false,
      errorMessage: error.message,
    };
  }
}

async function sendDiscordAlert(
  webhookUrl: string,
  monitorName: string,
  url: string,
  isUp: boolean,
  errorMsg?: string
) {
  const color = isUp ? 3066993 : 15158332; // green : red
  const embed = {
    embeds: [
      {
        title: isUp ? '✅ Monitor Recovered' : '🚨 Monitor Down',
        description: `**${monitorName}** (${url})`,
        fields: [
          {
            name: 'Status',
            value: isUp ? 'Back Online' : `Error: ${errorMsg || 'Timeout'}`,
          },
        ],
        color,
        timestamp: new Date().toISOString(),
      },
    ],
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(embed),
  });
}

export async function GET() {
  const now = new Date().toISOString();
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  // 1. Fetch active monitors due for a check
  const { data: monitors, error } = await supabaseService
    .from('monitors')
    .select('id, name, url, method, expected_status, user_id')
    .eq('is_active', true)
    .or(`last_checked_at.is.null, last_checked_at.lt.${fiveMinutesAgo}`);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!monitors || monitors.length === 0) {
    return NextResponse.json({ enqueued: 0 });
  }

  // 2. For each due monitor, ping and save result
  for (const monitor of monitors) {
    const result = await pingUrl(
      monitor.url,
      monitor.method || 'GET',
      monitor.expected_status || 200
    );

    // Store the ping
    const { error: pingError } = await supabaseService
      .from('pings')
      .insert({
        monitor_id: monitor.id,
        status_code: result.statusCode,
        response_time_ms: result.responseTime,
        is_up: result.isUp,
        error_message: result.errorMessage,
      });

    if (pingError) {
      console.error(`Failed to save ping for ${monitor.id}:`, pingError);
    }

    // Check for consecutive failures (last 2 pings) to decide if we should alert
    const { data: recentPings } = await supabaseService
      .from('pings')
      .select('is_up')
      .eq('monitor_id', monitor.id)
      .order('checked_at', { ascending: false })
      .limit(2);

    const consecutiveFailures =
      recentPings &&
      recentPings.length === 2 &&
      recentPings.every((p) => p.is_up === false);

    const isRecovery =
      result.isUp &&
      recentPings &&
      recentPings.length >= 2 &&
      recentPings[0]?.is_up === false; // previous ping was down, now up

    if (consecutiveFailures || isRecovery) {
      // Fetch the user’s Discord webhook
      const { data: settings } = await supabaseService
        .from('user_settings')
        .select('discord_webhook_url')
        .eq('user_id', monitor.user_id)
        .single();

      if (settings?.discord_webhook_url) {
        await sendDiscordAlert(
          settings.discord_webhook_url,
          monitor.name,
          monitor.url,
          result.isUp,
          result.errorMessage || undefined
        );

        // Optionally log the alert in the alerts table
        await supabaseService
          .from('alerts')
          .insert({
            monitor_id: monitor.id,
            alert_type: result.isUp ? 'RECOVERY' : 'DOWN',
            webhook_payload: {},
          });
      }
    }
  }

  // 3. Bulk update last_checked_at to avoid re‑checking them too soon
  const { error: updateError } = await supabaseService
    .from('monitors')
    .update({ last_checked_at: now })
    .in(
      'id',
      monitors.map((m) => m.id)
    );

  if (updateError) {
    console.error('Failed to update last_checked_at:', updateError);
  }

  return NextResponse.json({ enqueued: monitors.length });
}
