import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'uptimeguard' },
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
      },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              secure: true,
              sameSite: 'lax',
              path: '/',
            })
          )
        },
      },
    }
  )

  // refreshing the auth token
  const { data: { user } } = await supabase.auth.getUser()

  // If logged in and trying to access login page, redirect to dashboard to prevent redirect loops
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url, 303)
  }

  // protect routes under /(dashboard)
  // Note: App Router paths don't include the group `(dashboard)` in the URL.
  // The prompt says "protect all routes under /(dashboard)" but implies the URL path.
  // We'll protect /, /settings, /monitors/new. 
  // Let's assume any route that isn't /login, /register, /callback, or /status/* or /api/* requires auth.
  // NOTE: /api/* is intentionally treated as "public" here. Auth for API routes is
  // enforced per-route (see supabase.auth.getUser() calls inside each handler), not
  // by this middleware. If you add a new route under src/app/api/, you MUST add an
  // auth check inside that route's handler — middleware will NOT protect it.
  
  const isPublicRoute = request.nextUrl.pathname.startsWith('/login') || 
                        request.nextUrl.pathname.startsWith('/register') || 
                        request.nextUrl.pathname.startsWith('/callback') ||
                        request.nextUrl.pathname.startsWith('/status') ||
                        request.nextUrl.pathname.startsWith('/api') || 
                        request.nextUrl.pathname.includes('.'); // static files

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url, 303)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
