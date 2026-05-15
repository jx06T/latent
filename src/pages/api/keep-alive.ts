import type { APIRoute } from 'astro'

// Scheduled by Netlify (netlify.toml) and Vercel (vercel.json) to prevent
// Supabase free-tier project from being paused due to inactivity.
export const GET: APIRoute = async () => {
  const url = import.meta.env.PUBLIC_SUPABASE_URL
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return new Response(JSON.stringify({ error: 'env not configured' }), { status: 500 })
  }

  try {
    const res = await fetch(`${url}/rest/v1/projects?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    console.log(`[keep-alive] ping ${res.status}`)
    return new Response(JSON.stringify({ status: 'alive', code: res.status }), { status: 200 })
  } catch (err) {
    console.error('[keep-alive] fetch error:', err)
    return new Response(JSON.stringify({ error: 'fetch failed' }), { status: 500 })
  }
}
