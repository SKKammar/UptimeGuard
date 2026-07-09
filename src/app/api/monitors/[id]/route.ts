import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/supabase/require-user'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response, supabase } = await requireUser()
  if (response) return response
  const { id } = await params


  try {
    const body = await request.json()
    
    // RLS handles making sure users only update their own monitors
    const { data, error } = await supabase
      .from('monitors')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response, supabase } = await requireUser()
  if (response) return response
  const { id } = await params


  try {
    // RLS handles authorization
    const { error } = await supabase
      .from('monitors')
      .delete()
      .eq('id', id)

    if (error) throw error

    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
