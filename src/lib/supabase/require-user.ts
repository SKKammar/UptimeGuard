import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), supabase }
  }
  return { user, response: null, supabase }
}
