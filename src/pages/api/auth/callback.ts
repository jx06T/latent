import type { APIRoute } from 'astro'
import { createServerClient, parseCookieHeader } from '@supabase/ssr'
import { createAnonClient } from '@/lib/supabase-server'

export const GET: APIRoute = async ({ url, request, cookies, redirect }) => {
  const code = url.searchParams.get('code')
  const rawNext = url.searchParams.get('next') || '/'
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'

  console.log('[callback] code:', code ? '✓' : '✗ missing', '| next:', next)

  if (!code) {
    console.warn('[callback] No code → redirect /')
    return redirect('/')
  }

  // createServerClient (no Database generic) is only used for the PKCE exchange.
  // It reads the code_verifier from request cookies (set by createBrowserClient
  // when signInWithOAuth was called) and sets the session cookies in the response.
  const authClient = createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        // parseCookieHeader may return value?: string | undefined.
        // Map to value: string so it satisfies CookieMethodsServer.getAll.
        getAll: () =>
          parseCookieHeader(request.headers.get('Cookie') ?? '')
            .map(c => ({ name: c.name, value: c.value ?? '' })),

        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value, options }) =>
            cookies.set(name, value, options as Parameters<typeof cookies.set>[2])
          ),
      },
    }
  )

  const { data: authData, error: authError } =
    await authClient.auth.exchangeCodeForSession(code)

  console.log(
    '[callback] exchange →',
    authData?.session ? `user=${authData.session.user.email}` : 'no session',
    authError ? `error=${authError.message}` : '',
  )

  if (authError || !authData.session) {
    console.error('[callback] Exchange failed:', authError?.message)
    return redirect('/')
  }

  // Use our typed anon client (from supabase-server.ts) for DB queries —
  // avoids the createServerClient<Database> generic compatibility issue.
  const db = createAnonClient()
  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('is_onboarded')
    .eq('id', authData.session.user.id)
    .maybeSingle()

  console.log(
    '[callback] profile →',
    profile ? `is_onboarded=${profile.is_onboarded}` : 'not found',
    profileError ? `error=${profileError.message}` : '',
  )

  const dest = (!profile || !profile.is_onboarded)
    ? `/onboarding?next=${encodeURIComponent(next)}`
    : next

  console.log('[callback] → redirect to:', dest)
  return redirect(dest)
}
