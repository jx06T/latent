/**
 * 單張圖片的替換與刪除。
 *
 * PUT /api/images/:id
 *   - 僅允許 draft 圖；published 一律拒絕（要替換請 DELETE 後重新 POST）
 *   - body: { content_type, file_size }
 *   - 副檔名變了會先刪舊 R2 檔，發新 presigned URL
 *
 * DELETE /api/images/:id
 *   - draft 與 published 皆允許
 *   - processing 期間禁止
 *   - 自動刪 R2 上所有對應實體檔（草稿 1 個 / 已發布 N 個）
 *   - DB row 刪除，FK ON DELETE SET NULL 自動清掉 projects.cover_image_id
 *   - markdown 中殘留的 image-id-xxx 由前端自行處理
 */
import type { APIRoute } from 'astro'
import { z } from 'zod'
import { createServiceClient, verifyToken } from '@/lib/supabase-server'
import { generatePresignedPutUrl, generatePresignedGetUrl, deleteR2Objects } from '@/lib/r2'
import { draftKey, allKeysFor, type ProjectImageRow } from '@/lib/image-paths'

const MAX_FILE_BYTES = 5 * 1024 * 1024
const CONTENT_TYPE_TO_EXT: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
}

const cors = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
}
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: cors })

export const OPTIONS: APIRoute = () =>
    new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    })

// ── 共用授權邏輯 ─────────────────────────────────────────────────────────
type AuthorizedContext = {
    userId: string
    image: ProjectImageRow & { author_id: string }
}

async function authorize(
    request: Request,
    db: ReturnType<typeof createServiceClient>,
    imageId: string,
): Promise<AuthorizedContext | { error: Response }> {
    const auth = request.headers.get('Authorization')
    if (!auth?.startsWith('Bearer ')) return { error: json({ error: 'Unauthorized' }, 401) }

    let userId: string
    try { userId = await verifyToken(auth.slice(7)) }
    catch { return { error: json({ error: 'Unauthorized' }, 401) } }

    const { data: img } = await db
        .from('project_images')
        .select('id, project_id, author_id, status, source_ext, published_ext, available_sizes')
        .eq('id', imageId)
        .single()

    if (!img) return { error: json({ error: 'Image not found' }, 404) }
    if (!img.project_id) {
        console.error('[images] data integrity error: project_id is null', { image_id: img.id })
        return { error: json({ error: 'Internal data error' }, 500) }
    }
    if (img.author_id !== userId) return { error: json({ error: 'Forbidden' }, 403) }

    const { data: project } = await db
        .from('projects')
        .select('status')
        .eq('id', img.project_id)
        .single()

    if (project?.status === 'processing') {
        return { error: json({ error: 'Project is currently processing' }, 409) }
    }

    return { userId, image: img as AuthorizedContext['image'] }
}

// ── PUT：替換草稿圖 ─────────────────────────────────────────────────────
const putSchema = z.object({
    content_type: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    file_size: z.number().int().positive().max(MAX_FILE_BYTES),
})

export const PUT: APIRoute = async ({ request, params }) => {
    const idResult = z.string().uuid().safeParse(params.id)
    if (!idResult.success) {
        return json({ error: 'Invalid id' }, 400)
    }
    const imageId = idResult.data

    let raw: unknown
    try { raw = await request.json() }
    catch { return json({ error: 'Invalid JSON' }, 400) }

    const parsed = putSchema.safeParse(raw)
    if (!parsed.success) return json({ error: 'Invalid request' }, 400)

    const db = createServiceClient()
    const ctx = await authorize(request, db, imageId)
    if ('error' in ctx) return ctx.error

    const { image } = ctx

    // published 圖不允許替換
    if (image.status === 'published') {
        return json({
            error: 'Published images cannot be replaced. Delete it and upload a new one.',
        }, 409)
    }

    const newExt = CONTENT_TYPE_TO_EXT[parsed.data.content_type]
    const oldKey = draftKey(image.project_id, image.id, image.source_ext)
    const newKey = draftKey(image.project_id, image.id, newExt)

    // 副檔名改變 → 舊路徑檔案已不對應，先刪
    if (newExt !== image.source_ext) {
        try { await deleteR2Objects([oldKey]) }
        catch (err) { console.error('[images PUT] old R2 delete failed:', err) }
    }

    let uploadUrl: string
    let previewUrl: string
    try {
        [uploadUrl, previewUrl] = await Promise.all([
            generatePresignedPutUrl(newKey, parsed.data.content_type),
            generatePresignedGetUrl(newKey),
        ])
    } catch (err) {
        console.error('[images PUT] presign failed:', err)
        return json({ error: 'Storage service unavailable' }, 503)
    }

    const { error: updErr } = await db
        .from('project_images')
        .update({
            source_ext: newExt,
            uploaded_at: null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', imageId)

    if (updErr) {
        console.error('[images PUT] db update failed:', updErr)
        return json({ error: 'Database error' }, 500)
    }

    return json({
        image_id: imageId,
        upload_url: uploadUrl,
        preview_url: previewUrl,
    })
}

// ── DELETE：刪圖（draft 或 published） ──────────────────────────────────
export const DELETE: APIRoute = async ({ request, params }) => {
    const idResult = z.string().uuid().safeParse(params.id)
    if (!idResult.success) {
        return json({ error: 'Invalid id' }, 400)
    }
    const imageId = idResult.data

    const db = createServiceClient()
    const ctx = await authorize(request, db, imageId)
    if ('error' in ctx) return ctx.error

    const { image } = ctx

    // 列出所有實體路徑（draft 1 個 / published N 個）
    const keys = allKeysFor(image)

    // 先刪 R2（失敗只記 log，不阻擋 DB 刪除；殘留檔案可由 lifecycle 或人工清理）
    if (keys.length > 0) {
        try { await deleteR2Objects(keys) }
        catch (err) { console.error('[images DELETE] R2 delete failed:', err) }
    }

    // 刪 DB row（FK 會自動清 projects.cover_image_id）
    const { error: delErr } = await db.from('project_images').delete().eq('id', imageId)
    if (delErr) {
        console.error('[images DELETE] db delete failed:', delErr)
        return json({ error: 'Database error' }, 500)
    }

    return json({ message: 'Deleted', image_id: imageId })
}