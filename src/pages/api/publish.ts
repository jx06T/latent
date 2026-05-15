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

  // ── 1. 取得 project 資訊 ──
  const { data: project } = await db
    .from('projects')
    .select('id, author_id, status, slug, year')
    .eq('id', project_id)
    .single()

  if (!project || project.author_id !== userId) {
    return json({ error: 'Not found or forbidden' }, 403)
  }
  if (project.status === 'processing') {
    return json({ error: 'Already processing' }, 409)
  }

  // ── 2. Slug 衝突檢查（同年份下，排除自己） ──
  //   只檢查 published 的；其他人的 draft 不算佔用
  const { data: conflict } = await db
    .from('projects')
    .select('id')
    .eq('year', project.year)
    .eq('slug', project.slug)
    .eq('status', 'published')
    .neq('id', project_id)
    .maybeSingle()

  if (conflict) {
    return json({
      error: 'Slug conflict',
      message: `Slug "${project.slug}" is already used by another published project in ${project.year}.`,
      conflicting_field: 'slug',
    }, 409)
  }

  // ── 3. 原子鎖：只有 status=draft 才能轉 processing ──
  const { data: locked, error: lockErr } = await db
    .from('projects')
    .update({ status: 'processing' })
    .eq('id', project_id)
    .eq('status', 'draft')
    .select('id')
    .single()

  if (lockErr || !locked) return json({ error: 'Failed to acquire lock' }, 409)

  // ── 4. 觸發 background function ──
  const siteUrl = import.meta.env.PUBLIC_SITE_URL ?? 'http://localhost:8888'
  const internalToken = import.meta.env.INTERNAL_TOKEN ?? ''
  const bgPath = process.env.VERCEL ? '/api/publish-background' : '/functions/publish-background'

  try {
    const res = await fetch(`${siteUrl}${bgPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Token': internalToken },
      body: JSON.stringify({ project_id, author_id: userId }),
    })

    // Background function 應該回 202；一般 function 回 2xx 也算成功
    if (!res.ok && res.status !== 202) {
      console.error('[publish] background returned non-ok:', res.status)
      await db.from('projects').update({ status: 'draft' }).eq('id', project_id)
      return json({ error: 'Failed to enqueue' }, 502)
    }
  } catch (err) {
    console.error('[publish] background trigger failed:', err)
    await db.from('projects').update({ status: 'draft' }).eq('id', project_id)
    return json({ error: 'Failed to enqueue' }, 502)
  }

  return json({ message: 'Publishing started', project_id }, 202)
}