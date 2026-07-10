import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  // Use NEXT_PUBLIC_APP_URL for explicit production domain, fallback to origin for local dev
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin

  if (code) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth Callback Error exchanging code:', error.message, error)
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, baseUrl))
      }
    } catch (err) {
      console.error('Unexpected Auth Callback Error:', err)
      return NextResponse.redirect(new URL(`/login?error=Unexpected_Error`, baseUrl))
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL('/dashboard', baseUrl))
}
