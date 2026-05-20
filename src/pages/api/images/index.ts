import type { APIRoute } from 'astro'
import { z } from 'zod'
import { createServiceClient, verifyToken } from '@/lib/supabase-server'
import { generatePresignedPutUrl, generatePresignedGetUrl } from '@/lib/r2'
import { draftKey } from '@/lib/image-paths'

const MAX_IMAGES_PER_PROJECT = 10
const MAX_FILE_BYTES = 5 * 1024 * 1024

const CONTENT_TYPE_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const bodySchema = z.object({
  project_id: z.uuid(),
  content_type: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  file_size: z.number().int().positive().max(MAX_FILE_BYTES),
})

const ORIGIN = import.meta.env.PUBLIC_SITE_URL
const cors = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': ORIGIN,
}
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: cors })

export const OPTIONS: APIRoute = () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })

export const POST: APIRoute = async ({ request }) => {
  // 1. JWT
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)
  let userId: string
  try { userId = await verifyToken(auth.slice(7)) }
  catch { return json({ error: 'Unauthorized' }, 401) }

  // 2. body
  let raw: unknown
  try { raw = await request.json() }
  catch { return json({ error: 'Invalid JSON' }, 400) }

  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return json({ error: 'Invalid request' }, 400)
  }

  const { project_id, content_type } = parsed.data
  const db = createServiceClient()

  // 3. 所有權與狀態
  const { data: project, error: projErr } = await db
    .from('projects')
    .select('id, author_id, status')
    .eq('id', project_id)
    .single()

  if (projErr || !project) return json({ error: 'Project not found' }, 404)
  if (project.author_id !== userId) return json({ error: 'Forbidden' }, 403)
  if (project.status === 'processing') {
    return json({ error: 'Project is currently processing' }, 409)
  }

  // 4. 配額（總圖數，draft + published 一起算）
  const { count } = await db
    .from('project_images')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', project_id)

  if ((count ?? 0) >= MAX_IMAGES_PER_PROJECT) {
    return json({ error: 'Image quota exceeded', limit: MAX_IMAGES_PER_PROJECT }, 403)
  }

  // 5. presigned URL
  const imageId = crypto.randomUUID()
  const sourceExt = CONTENT_TYPE_TO_EXT[content_type]
  const key = draftKey(project_id, imageId, sourceExt)

  let uploadUrl: string
  let previewUrl: string
  try {
    [uploadUrl, previewUrl] = await Promise.all([
      generatePresignedPutUrl(key, content_type, parsed.data.file_size),
      generatePresignedGetUrl(key),
    ])
  } catch (err) {
    console.error('[images POST] presign failed:', err)
    return json({ error: 'Storage service unavailable' }, 503)
  }

  // 6. DB insert
  const { error: insertErr } = await db.from('project_images').insert({
    id: imageId,
    project_id,
    author_id: userId,
    status: 'draft',
    source_ext: sourceExt,
    published_ext: null,
    available_sizes: null,
    uploaded_at: null,
  })

  if (insertErr) {
    console.error('[images POST] db insert failed:', insertErr)
    return json({ error: 'Database error' }, 500)
  }

  return json({
    image_id: imageId,
    upload_url: uploadUrl,
    preview_url: previewUrl,
  })
}