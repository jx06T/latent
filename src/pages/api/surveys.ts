import type { APIRoute } from 'astro'
import { z } from 'zod'
import { createServiceClient, verifyToken } from '@/lib/supabase-server'
import { SURVEY_QUESTIONS } from '@/lib/survey-questions'
import { ipHash, clientIp } from '@/lib/rate-limit'

const [ageQ, referralQ, genderQ, exhibitionQ] = SURVEY_QUESTIONS
const bodySchema = z.object({
  age_group:        z.enum(ageQ.options).nullish(),
  referral_source:  z.enum(referralQ.options).nullish(),
  gender:           z.enum(genderQ.options).nullish(),
  exhibition_plan:  z.enum(exhibitionQ.options).nullish(),
})

export const POST: APIRoute = async ({ request }) => {
  let raw: unknown
  try { raw = await request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) return json({ error: 'Invalid request' }, 400)

  const fields = parsed.data

  // Derive user_id from verified JWT (never trust body-supplied user_id)
  let userId: string | null = null
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    try { userId = await verifyToken(authHeader.slice(7)) } catch { /* anonymous */ }
  }

  const db = createServiceClient()

  // Deduplicate by user_id (logged-in users)
  if (userId) {
    const { count } = await db
      .from('surveys')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    if ((count ?? 0) > 0) return json({ ok: true }, 200)
  }

  // Rate limit by IP: max 60 per 12h
  const hash = await ipHash(clientIp(request))
  const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  const { count: ipCount } = await db
    .from('surveys')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', hash)
    .gte('created_at', since)

  if ((ipCount ?? 0) >= 60) return json({ error: 'Too many submissions' }, 429)

  const { error } = await db.from('surveys').insert({
    ...fields,
    user_id: userId,
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
