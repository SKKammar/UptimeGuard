import { MonitorForm } from '@/components/forms/monitor-form'

export default function NewMonitorPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Add New Monitor</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <MonitorForm />
      </div>
    </div>
  )
}
