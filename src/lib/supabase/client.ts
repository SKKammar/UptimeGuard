import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
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
      cookieOptions: {
        secure: true, // REQUIRED for HTTPS (Vercel)
        sameSite: 'lax',
        path: '/',
      }
    }
  )
}
