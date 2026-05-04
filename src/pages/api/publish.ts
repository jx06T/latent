import type { APIRoute } from 'astro'
import { z } from 'zod'
import { createServiceClient, verifyToken } from '@/lib/supabase-server'

const bodySchema = z.object({
  project_id: z.string().uuid(),
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const POST: APIRoute = async ({ request }) => {
  // ── 1. 驗證 JWT ──────────────────────────────────────────────────────────
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

  let userId: string
  try {
    userId = await verifyToken(auth.slice(7))
  } catch {
    return json({ error: 'Unauthorized' }, 401)
  }

  // ── 2. 解析 body ─────────────────────────────────────────────────────────
  let raw: unknown
  try { raw = await request.json() } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) return json({ error: 'Invalid request' }, 400)

  const { project_id } = parsed.data
  const db = createServiceClient()

  // ── 3. 確認所有權 ─────────────────────────────────────────────────────────
  const { data: project } = await db
    .from('projects')
    .select('id, author_id, status')
    .eq('id', project_id)
    .single()

  if (!project || project.author_id !== userId) return json({ error: 'Not found or forbidden' }, 403)
  if (project.status === 'processing') return json({ error: 'Already processing' }, 409)

  // ── 4. 鎖定專案（防止重複發布） ──────────────────────────────────────────
  const { error: lockErr } = await db
    .from('projects')
    .update({ status: 'processing' })
    .eq('id', project_id)

  if (lockErr) {
    console.error('[publish] lock failed:', lockErr)
    return json({ error: 'Database error' }, 500)
  }

  // ── 5. 觸發背景函式（Fire-and-forget，立刻回 202） ────────────────────────
  const siteUrl       = import.meta.env.PUBLIC_SITE_URL ?? 'http://localhost:8888'
  const internalToken = import.meta.env.INTERNAL_TOKEN ?? ''

  // 不等待回應，讓背景函式自行處理
  fetch(`${siteUrl}/.netlify/functions/publish-background`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Token': internalToken,
    },
    body: JSON.stringify({ project_id, author_id: userId }),
  }).catch(err => console.error('[publish] background trigger failed:', err))

  return json({ message: 'Publishing started', project_id }, 202)
}
