import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/require-user'

export async function GET() {
  const { user, response, supabase } = await requireUser()
  if (response) return response


  const { data, error } = await supabase
    .from('monitors')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const { user, response, supabase } = await requireUser()
  if (response) return response

  try {
    const body = await request.json()
    const { name, url, method, expected_status, check_interval_seconds } = body

    if (!name || !url) {
      return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('monitors')
      .insert({
        user_id: user.id,
        name,
        url,
        method: method || 'GET',
        expected_status: expected_status || 200,
        check_interval_seconds: check_interval_seconds || 60,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
