import type { APIRoute } from 'astro'
import { z } from 'zod'
import { createServiceClient, verifyToken } from '@/lib/supabase-server'
import { generatePresignedPutUrl, deleteR2Objects } from '@/lib/r2'

const MAX_CONTENT_IMAGES = 8
const MAX_FILE_BYTES     = 5 * 1024 * 1024 // 5 MB

const bodySchema = z.object({
  project_id:      z.string().uuid(),
  markdown_content: z.string().max(200_000),
  image_type:      z.enum(['cover', 'content']),
  content_type:    z.enum(['image/jpeg', 'image/webp', 'image/png']),
  file_size:       z.number().int().positive().max(MAX_FILE_BYTES),
})

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }
}

export const OPTIONS: APIRoute = () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })

export const POST: APIRoute = async ({ request }) => {
  // ── 1. 驗證 JWT ──────────────────────────────────────────────────────────
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders() })
  }

  let userId: string
  try {
    userId = await verifyToken(auth.slice(7))
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders() })
  }

  // ── 2. 解析 body ─────────────────────────────────────────────────────────
  let raw: unknown
  try { raw = await request.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders() })
  }

  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'Invalid request', details: parsed.error.issues }),
      { status: 400, headers: corsHeaders() },
    )
  }

  const { project_id, markdown_content, image_type, content_type, file_size } = parsed.data
  const db = createServiceClient()

  // ── 3. 確認專案所有權與可編輯性 ──────────────────────────────────────────
  const { data: project, error: projErr } = await db
    .from('projects')
    .select('id, author_id, status')
    .eq('id', project_id)
    .single()

  if (projErr || !project) {
    return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404, headers: corsHeaders() })
  }
  if (project.author_id !== userId) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders() })
  }
  if (project.status === 'processing') {
    return new Response(JSON.stringify({ error: 'Project is currently processing' }), { status: 409, headers: corsHeaders() })
  }

  // ── 4. Auto GC：清除孤兒草稿圖片 ────────────────────────────────────────
  if (image_type === 'content') {
    const { data: draftImages } = await db
      .from('project_images')
      .select('id, storage_key')
      .eq('project_id', project_id)
      .eq('image_type', 'content')
      .eq('status', 'draft')

    if (draftImages && draftImages.length > 0) {
      // 孤兒 = 在 DB 裡但 markdown 裡沒有出現其 id
      const orphans = draftImages.filter(img => !markdown_content.includes(img.id))

      if (orphans.length > 0) {
        await deleteR2Objects(orphans.map(img => img.storage_key))
        await db
          .from('project_images')
          .delete()
          .in('id', orphans.map(img => img.id))
      }
    }

    // ── 5. 配額檢查（清理後）────────────────────────────────────────────────
    const { count } = await db
      .from('project_images')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project_id)
      .eq('image_type', 'content')

    if ((count ?? 0) >= MAX_CONTENT_IMAGES) {
      return new Response(
        JSON.stringify({ error: 'Image quota exceeded', limit: MAX_CONTENT_IMAGES }),
        { status: 403, headers: corsHeaders() },
      )
    }
  }

  // ── 6. 產生 Presigned PUT URL ─────────────────────────────────────────────
  const ext: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/png':  'png',
  }
  const imageId    = crypto.randomUUID()
  const storageKey = `drafts/${project_id}/${imageId}.${ext[content_type]}`

  let uploadUrl: string
  try {
    uploadUrl = await generatePresignedPutUrl(storageKey, content_type)
  } catch (err) {
    console.error('[upload-url] presign failed:', err)
    return new Response(
      JSON.stringify({ error: 'Storage service unavailable' }),
      { status: 503, headers: corsHeaders() },
    )
  }

  // ── 7. 寫入 DB ────────────────────────────────────────────────────────────
  const { error: insertErr } = await db.from('project_images').insert({
    id: imageId,
    project_id,
    author_id: userId,
    storage_key: storageKey,
    image_type,
    status: 'draft',
  })

  if (insertErr) {
    console.error('[upload-url] db insert failed:', insertErr)
    return new Response(JSON.stringify({ error: 'Database error' }), { status: 500, headers: corsHeaders() })
  }

  return new Response(
    JSON.stringify({ upload_url: uploadUrl, image_id: imageId, storage_key: storageKey }),
    { status: 200, headers: corsHeaders() },
  )
}
