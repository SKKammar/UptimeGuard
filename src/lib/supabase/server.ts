import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'uptimeguard' },
      global: {
        fetch: (url: RequestInfo | URL, options?: RequestInit) => {
          // APPEND TIMESTAMP TO KILL ALL CACHING FOREVER
          const urlString = url instanceof Request ? url.url : url.toString();
          const newUrl = new URL(urlString);
          newUrl.searchParams.set('_t', Date.now().toString());
          
          return fetch(newUrl.toString(), {
            ...options,
            cache: 'no-store',
            headers: {
              ...options?.headers,
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
            },
          });
        },
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                secure: true,
                sameSite: 'lax',
                path: '/',
              })
            })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
