import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';
  
  // Explicitly construct baseUrl for redirects like before
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Success! Redirect to dashboard (or next).
      return NextResponse.redirect(new URL(next, baseUrl), 303);
    }

    // Log the error (optional) and redirect to login with error
    console.error('Auth callback error:', error);
  }

  // If no code or error, redirect to login with error param
  return NextResponse.redirect(new URL('/login?error=auth_failed', baseUrl), 303);
}
