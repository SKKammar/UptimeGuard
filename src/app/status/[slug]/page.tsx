import { createClient } from '@supabase/supabase-js'
import { StatusDot } from '@/components/status/status-dot'
import { UptimeChart } from '@/components/dashboard/uptime-chart'
import { notFound } from 'next/navigation'

// Use service client to read data for public page
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: 'uptimeguard' } }
  )
}

export default async function StatusPage({ params }: { params: Promise<{ slug: string }> }) {
  const supabase = createServiceClient()
  const { slug } = await params

  // Fetch monitor details
  const { data: monitor } = await supabase
    .from('monitors')
    .select('id, name, url, is_public')
    .eq('id', slug)
    .single()

  if (!monitor || !monitor.is_public) {
    notFound()
  }

  // Fetch last 30 days of pings (or limited to last 1000 for chart)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: pings } = await supabase
    .from('pings')
    .select('checked_at, response_time_ms, is_up')
    .eq('monitor_id', monitor.id)
    .gte('checked_at', thirtyDaysAgo.toISOString())
    .order('checked_at', { ascending: false })
    .limit(100) // limit for UI performance, you can adjust

  const pingsList = pings || []
  const latestPing = pingsList.length > 0 ? pingsList[0] : null
  const isUp = latestPing ? latestPing.is_up : false

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{monitor.name}</h1>
            <a href={monitor.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
              {monitor.url}
            </a>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-medium text-gray-700">
              {latestPing ? (isUp ? 'Operational' : 'Down') : 'Unknown'}
            </span>
            <StatusDot isUp={isUp} className="h-4 w-4" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Response Time</h2>
          <UptimeChart data={pingsList} />
        </div>

      </div>
    </div>
  )
}
