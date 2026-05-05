/**
 * 單張圖片的替換與刪除。
 *
 * PUT /api/images/:id
 *   - draft 圖：直接替換，覆蓋 R2 草稿檔
 *   - published 圖：刪除所有發布版本，row 降級為 draft，
 *                   project 自動降級為 draft，需重新發布
 *   - 副檔名變了會先刪舊 R2 檔
 *   - body: { content_type, file_size }
 *   - 回應: { image_id, upload_url, preview_url, project_downgraded }
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
    if (img.author_id !== userId) return { error: json({ error: 'Forbidden' }, 403) }

    const { data: project } = await db
        .from('projects')
        .select('status')
        .eq('id', img.project_id)
        .single()

    if (project?.status === 'processing') {
        return { error: json({ error: 'Project is currently processing' }, 409) }
    }

    return { userId, image: img as ProjectImageRow & { author_id: string } }
}

// ── PUT：替換圖片（draft 或 published） ──────────────────────────────────
const putSchema = z.object({
    content_type: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    file_size: z.number().int().positive().max(MAX_FILE_BYTES),
})

export const PUT: APIRoute = async ({ request, params }) => {
    if (!params.id) return json({ error: 'ID is required' }, 400)

    const idResult = z.string().uuid().safeParse(params.id)
    if (!idResult.success) return json({ error: 'Invalid id' }, 400)
    const imageId = idResult.data

    let raw: unknown
    try { raw = await request.json() }
    catch { return json({ error: 'Invalid JSON' }, 400) }

    const parsed = putSchema.safeParse(raw)
    if (!parsed.success) return json({ error: 'Invalid request', details: parsed.error.issues }, 400)

    const db = createServiceClient()
    const ctx = await authorize(request, db, imageId)
    if ('error' in ctx) return ctx.error

    const { image } = ctx
    const wasPublished = image.status === 'published'
    const newExt = CONTENT_TYPE_TO_EXT[parsed.data.content_type]

    // ── 1. 若是 published：刪所有 published R2 檔 + 降級 project ─────────
    if (wasPublished) {
        const oldKeys = allKeysFor(image)
        try { await deleteR2Objects(oldKeys) }
        catch (err) { console.error('[images PUT] published cleanup failed:', err) }

        const { error: projDowngradeErr } = await db
            .from('projects')
            .update({ status: 'draft' })
            .eq('id', image.project_id)

        if (projDowngradeErr) {
            console.error('[images PUT] project downgrade failed:', projDowngradeErr)
            return json({ error: 'Database error' }, 500)
        }
    }

    // ── 2. 若是 draft 且副檔名變了：刪舊 draft 檔 ───────────────────────
    if (!wasPublished && newExt !== image.source_ext) {
        const oldDraftKey = draftKey(image.project_id, image.id, image.source_ext)
        try { await deleteR2Objects([oldDraftKey]) }
        catch (err) { console.error('[images PUT] old draft delete failed:', err) }
    }

    // ── 3. 產生新 presigned URL ─────────────────────────────────────────
    const newKey = draftKey(image.project_id, image.id, newExt)

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

    // ── 4. 更新 DB row ──────────────────────────────────────────────────
    //   draft → draft：只更新 source_ext / uploaded_at / updated_at
    //   published → draft：額外重置 status / published_ext / available_sizes
    const updatePayload: {
        source_ext: string
        uploaded_at: null
        updated_at: string
        status?: 'draft'
        published_ext?: null
        available_sizes?: null
    } = {
        source_ext: newExt,
        uploaded_at: null,
        updated_at: new Date().toISOString(),
    }

    if (wasPublished) {
        updatePayload.status = 'draft'
        updatePayload.published_ext = null
        updatePayload.available_sizes = null
    }

    const { error: updErr } = await db
        .from('project_images')
        .update(updatePayload)
        .eq('id', imageId)

    if (updErr) {
        console.error('[images PUT] db update failed:', updErr)
        return json({ error: 'Database error' }, 500)
    }

    return json({
        image_id: imageId,
        upload_url: uploadUrl,
        preview_url: previewUrl,
        project_downgraded: wasPublished,
    })
}

// ── DELETE：刪圖（draft 或 published） ──────────────────────────────────
export const DELETE: APIRoute = async ({ request, params }) => {
    if (!params.id) return json({ error: 'ID is required' }, 400)

    const idResult = z.string().uuid().safeParse(params.id)
    if (!idResult.success) return json({ error: 'Invalid id' }, 400)
    const imageId = idResult.data

    const db = createServiceClient()
    const ctx = await authorize(request, db, imageId)
    if ('error' in ctx) return ctx.error

    const { image } = ctx

    // 列出所有實體路徑（draft 1 個 / published N 個）
    const keys = allKeysFor(image)

    // 先刪 R2（失敗只記 log，不阻擋 DB 刪除；殘留檔案靠 lifecycle 或人工清理）
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