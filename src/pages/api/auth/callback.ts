import type { APIRoute } from 'astro'
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'

// 白名單：只允許導向這些路徑（或其子路徑）
const ALLOWED_NEXT_PREFIXES = ['/', '/profile', '/explore', '/onboarding'] // 依你的實際路由調整

function sanitizeNext(raw: string | null): string {
  if (!raw) return '/'
  // 必須是同源相對路徑
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  // 不允許導回 API endpoints（避免 code 被夾帶或產生循環）
  if (raw.startsWith('/api/')) return '/'
  // 不允許再帶 query string（避免攜帶 stale code 等）
  const pathOnly = raw.split('?')[0].split('#')[0]
  // 白名單比對
  const ok = ALLOWED_NEXT_PREFIXES.some(
    p => pathOnly === p || pathOnly.startsWith(p === '/' ? '/' : p + '/')
  )
  return ok ? pathOnly : '/'
}

export const GET: APIRoute = async ({ url, request }) => {
  const code = url.searchParams.get('code')
  const next = sanitizeNext(url.searchParams.get('next'))

  console.log('[callback] code:', code ? '✓' : '✗ missing', '| next:', next)

  // 統一的 redirect helper：永遠不帶 code,next 等查詢參數
  const redirect = (location: string, extraHeaders?: Headers) => {
    const headers = extraHeaders ?? new Headers()
    headers.set('Location', location)
    // 防止 CDN/瀏覽器快取這個重導
    headers.set('Cache-Control', 'no-store')
    return new Response(null, { status: 302, headers })
  }

  if (!code) {
    console.warn('[callback] No code → redirect /')
    return redirect('/')
  }

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

  try {
    const { data: authData, error: authError } =
      await authClient.auth.exchangeCodeForSession(code)

    if (authError || !authData?.session) {
      console.error('[callback] Exchange failed:', authError?.message)
      return redirect('/', responseHeaders)
    }

    console.log('[callback] user=', authData.session.user.email, '→', next)
    return redirect(next, responseHeaders)
  } catch (err) {
    console.error('[callback] Unexpected error:', err)
    return redirect('/', responseHeaders)
  }
}