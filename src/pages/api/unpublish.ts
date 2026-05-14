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

  if (!project) return json({ error: 'Not found' }, 404)
  if (project.author_id !== userId) return json({ error: 'Forbidden' }, 403)

  if (project.status === 'processing') {
    return json({ error: 'Cannot unpublish while processing', code: 'PROCESSING' }, 409)
  }
  if (project.status !== 'published') {
    return json({ error: 'Only published projects can be unpublished', code: 'NOT_PUBLISHED' }, 400)
  }

  const { error: updErr } = await db
    .from('projects')
    .update({ status: 'draft' })
    .eq('id', project_id)
    .eq('status', 'published')

  if (updErr) {
    if (updErr.code === '23514' || updErr.message?.includes('Draft quota exceeded')) {
      return json({
        error: 'Draft quota exceeded',
        code: 'DRAFT_QUOTA_EXCEEDED',
        message: '草稿數已達上限 (3)，請先刪除一個草稿再取消發布',
      }, 409)
    }
    console.error('[unpublish] db error:', updErr)
    return json({ error: 'Database error' }, 500)
  }

  return json({ message: 'Unpublished', project_id })
}
