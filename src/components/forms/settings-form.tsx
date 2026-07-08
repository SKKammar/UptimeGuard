"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export function SettingsForm({ initialWebhook }: { initialWebhook: string | null }) {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setSuccess(false)
    const formData = new FormData(e.currentTarget)
    const discordWebhook = formData.get("discord_webhook") as string

    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      await supabase.from('user_settings').upsert({
        user_id: user.id,
        discord_webhook_url: discordWebhook || null,
      }, { onConflict: 'user_id' })
      
      setSuccess(true)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="discord_webhook">Discord Webhook URL</Label>
        <Input 
          id="discord_webhook" 
          name="discord_webhook" 
          type="url" 
          defaultValue={initialWebhook || ""} 
          placeholder="https://discord.com/api/webhooks/..." 
        />
        <p className="text-sm text-gray-500">We'll send notifications here when a monitor goes down.</p>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Settings"}
      </Button>

      {success && <p className="text-sm text-green-600 mt-2">Settings saved successfully.</p>}
    </form>
  )
}
