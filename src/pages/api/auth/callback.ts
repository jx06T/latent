import type { APIRoute } from 'astro'
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'

export const GET: APIRoute = async ({ url, request }) => {
  const code = url.searchParams.get('code')
  const rawNext = url.searchParams.get('next') || '/'
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'

  console.log('[callback] code:', code ? '✓' : '✗ missing', '| next:', next)

  if (!code) {
    console.warn('[callback] No code → redirect /')
    return new Response(null, { status: 302, headers: { Location: '/' } })
  }

  // Write Set-Cookie headers to a plain Headers object.
  // Using Astro's cookies.set() causes ResponseSentError because Supabase's
  // internal _emitInitialSession fires setAll asynchronously after redirect() is called.
  const responseHeaders = new Headers()

  const authClient = createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () =>
          parseCookieHeader(request.headers.get('Cookie') ?? '')
            .map(c => ({ name: c.name, value: c.value ?? '' })),

        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value, options }) =>
            responseHeaders.append('Set-Cookie', serializeCookieHeader(name, value, options))
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
    return new Response(null, { status: 302, headers: { Location: '/' } })
  }

  // No forced onboarding — users can like/comment immediately after login.
  // Onboarding is only triggered when accessing creator features (/profile).
  console.log('[callback] → redirect to:', next)
  responseHeaders.set('Location', next)
  return new Response(null, { status: 302, headers: responseHeaders })
}
