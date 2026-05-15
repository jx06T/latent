/**
 * POST /api/images/process-pending
 *   - Re-triggers image processing for a published project that has draft images
 *   - Project must be in 'published' status (not draft, not processing)
 *   - Atomically transitions published → processing, then fires publish-background
 */
import type { APIRoute } from 'astro'
import { z } from 'zod'
import { createServiceClient, verifyToken } from '@/lib/supabase-server'

const bodySchema = z.object({ project_id: z.uuid() })

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

  // 1. Verify ownership and that project is published
  const { data: project } = await db
    .from('projects')
    .select('id, author_id, status')
    .eq('id', project_id)
    .single()

  if (!project || project.author_id !== userId) return json({ error: 'Not found or forbidden' }, 403)
  if (project.status === 'processing') return json({ error: 'Already processing' }, 409)
  if (project.status !== 'published') return json({ error: 'Project must be published to re-process' }, 400)

  // 2. Verify there are actually pending draft images
  const { count } = await db
    .from('project_images')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', project_id)
    .eq('status', 'draft')

  if (!count || count === 0) return json({ error: 'No pending images to process' }, 400)

  // 3. Atomically transition published → processing
  const { data: locked, error: lockErr } = await db
    .from('projects')
    .update({ status: 'processing' })
    .eq('id', project_id)
    .eq('status', 'published')
    .select('id')
    .single()

  if (lockErr || !locked) return json({ error: 'Failed to acquire lock' }, 409)

  // 4. Fire background processing (same as publish flow)
  const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? 'http://localhost:8888'
  const internalToken = import.meta.env.INTERNAL_TOKEN ?? ''

  try {
    const res = await fetch(`${siteUrl}/functions/publish-background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Token': internalToken },
      body: JSON.stringify({ project_id, author_id: userId }),
    })
    if (!res.ok && res.status !== 202) {
      console.error('[process-pending] background returned non-ok:', res.status)
      await db.from('projects').update({ status: 'published' }).eq('id', project_id)
      return json({ error: 'Failed to enqueue' }, 502)
    }
  } catch (err) {
    console.error('[process-pending] background trigger failed:', err)
    await db.from('projects').update({ status: 'published' }).eq('id', project_id)
    return json({ error: 'Failed to enqueue' }, 502)
  }

  return json({ message: 'Processing started', project_id }, 202)
}
