import { createClient } from '@/lib/supabase/server'
import { MonitorList } from '@/components/dashboard/monitor-list'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: monitors } = await supabase
    .from('monitors')
    .select('*')
    .order('created_at', { ascending: false })
    
  const monitorsList = monitors || []
  const initialStatuses: Record<string, any> = {}

  // Fetch the latest ping for each monitor
  if (monitorsList.length > 0) {
    const monitorIds = monitorsList.map(m => m.id)
    const { data: latestPings } = await supabase
      .from('pings')
      .select('monitor_id, is_up, response_time_ms')
      .in('monitor_id', monitorIds)
      .order('checked_at', { ascending: false })
      
    if (latestPings) {
      // Group by monitor_id and keep only the first (latest)
      for (const ping of latestPings) {
        if (!initialStatuses[ping.monitor_id]) {
          initialStatuses[ping.monitor_id] = ping
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Monitors</h1>
        <Link href="/monitors/new">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Monitor
          </Button>
        </Link>
      </div>

      <MonitorList initialMonitors={monitorsList} initialStatuses={initialStatuses} />
    </div>
  )
}
