import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { 
      db: { schema: 'uptimeguard' },
      global: {
        fetch: (url, options) => {
          return fetch(url, { ...options, cache: 'no-store' })
        },
      },
      cookieOptions: {
        secure: true, // REQUIRED for HTTPS (Vercel)
        sameSite: 'lax',
        path: '/',
      }
    }
  )
}
