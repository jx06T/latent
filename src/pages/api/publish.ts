import type { APIRoute } from 'astro'
import { z } from 'zod'
import { createServiceClient, verifyToken } from '@/lib/supabase-server'

const bodySchema = z.object({ project_id: z.string().uuid() })

const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } })

export const POST: APIRoute = async ({ request }) => {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

  let userId: string
  try { userId = await verifyToken(auth.slice(7)) }
  catch { return json({ error: 'Unauthorized' }, 401) }

  let raw: unknown
  try { raw = await request.json() }
  catch { return json({ error: 'Invalid JSON' }, 400) }

  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) return json({ error: 'Invalid request' }, 400)

  const { project_id } = parsed.data
  const db = createServiceClient()

  const { data: project } = await db
    .from('projects')
    .select('id, author_id, status')
    .eq('id', project_id)
    .single()

  if (!project || project.author_id !== userId) return json({ error: 'Not found or forbidden' }, 403)
  if (project.status === 'processing') return json({ error: 'Already processing' }, 409)

  // 原子鎖：只有 status=draft 才能轉 processing
  const { data: locked, error: lockErr } = await db
    .from('projects')
    .update({ status: 'processing' })
    .eq('id', project_id)
    .eq('status', 'draft')
    .select('id')
    .single()

  if (lockErr || !locked) return json({ error: 'Failed to acquire lock' }, 409)

  const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? 'http://localhost:8888'
  const internalToken = import.meta.env.INTERNAL_TOKEN ?? ''

  fetch(`${siteUrl}/api/publish-background`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Internal-Token': internalToken },
    body: JSON.stringify({ project_id, author_id: userId }),
  }).catch(err => console.error('[publish] background trigger failed:', err))

  return json({ message: 'Publishing started', project_id }, 202)
}