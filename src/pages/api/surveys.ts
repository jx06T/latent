import type { APIRoute } from 'astro'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase-server'
import { SURVEY_QUESTIONS } from '@/lib/survey-questions'

const [ageQ, referralQ, genderQ, exhibitionQ] = SURVEY_QUESTIONS
const bodySchema = z.object({
  age_group:        z.enum(ageQ.options).nullish(),
  referral_source:  z.enum(referralQ.options).nullish(),
  gender:           z.enum(genderQ.options).nullish(),
  exhibition_plan:  z.enum(exhibitionQ.options).nullish(),
  user_id:          z.uuid().nullish(),
})

async function ipHash(ip: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + ':latent'))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function clientIp(request: Request): string {
  return (
    request.headers.get('x-nf-client-connection-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  )
}

export const POST: APIRoute = async ({ request }) => {
  let raw: unknown
  try { raw = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) return json({ error: 'Invalid request' }, 400)

  const { user_id, ...fields } = parsed.data
  const db = createServiceClient()

  // Deduplicate by user_id (logged-in users)
  if (user_id) {
    const { count } = await db
      .from('surveys')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user_id)

    if ((count ?? 0) > 0) return json({ ok: true }, 200)
  }

  // Rate limit by IP: max 3 per 24h
  const hash = await ipHash(clientIp(request))
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count: ipCount } = await db
    .from('surveys')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', hash)
    .gte('created_at', since)

  if ((ipCount ?? 0) >= 30) return json({ error: 'Too many submissions' }, 429)

  const { error } = await db.from('surveys').insert({
    ...fields,
    user_id: user_id ?? null,
    ip_hash: hash,
  })

  if (error) {
    console.error('[surveys POST] db insert failed:', error)
    return json({ error: 'Database error' }, 500)
  }

  return json({ ok: true }, 201)
}

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
