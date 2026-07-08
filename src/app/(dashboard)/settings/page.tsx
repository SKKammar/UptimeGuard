import { createClient } from '@/lib/supabase/server'
import { SettingsForm } from '@/components/forms/settings-form'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let initialWebhook = null
  if (user) {
    const { data } = await supabase
      .from('user_settings')
      .select('discord_webhook_url')
      .eq('user_id', user.id)
      .single()
      
    if (data) {
      initialWebhook = data.discord_webhook_url
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Notifications</h2>
        <SettingsForm initialWebhook={initialWebhook} />
      </div>
    </div>
  )
}
