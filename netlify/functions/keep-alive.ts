import type { Config,Handler } from '@netlify/functions'

export const handler: Handler = async () => {
  const url  = process.env.PUBLIC_SUPABASE_URL
  const key  = process.env.PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('[keep-alive] Supabase env vars not set')
    return { statusCode: 500, body: 'env not configured' }
  }

  try {
    const res = await fetch(`${url}/rest/v1/projects?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    console.log(`[keep-alive] ping ${res.status}`)
    return { statusCode: 200, body: JSON.stringify({ status: 'alive', code: res.status }) }
  } catch (err) {
    console.error('[keep-alive] fetch error:', err)
    return { statusCode: 500, body: 'fetch failed' }
  }
}

export const config: Config = { path: '/functions/keep-alive' }
