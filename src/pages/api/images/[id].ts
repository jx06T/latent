/**
 * 單張圖片操作。
 *
 * PUT /api/images/:id
 *   - 已停用（405）。圖片 ID 即內容身份，不允許原地覆寫。
 *   - 替換請用：POST /api/images（取得新 ID）→ 更新 markdown 引用 → DELETE 舊圖
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
import { deleteR2Objects } from '@/lib/r2'
import { allKeysFor, type ProjectImageRow } from '@/lib/image-paths'

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

// ── PUT：已停用 ──────────────────────────────────────────────────────────
// 圖片 ID 即其內容的身份識別，不允許原地覆寫（draft 或 published 一律拒絕）。
// 替換流程：POST /api/images（取新 ID） → 更新 markdown 引用 → DELETE /api/images/:id
export const PUT: APIRoute = () =>
    json(
        {
            error: 'Image replacement is disabled. Upload a new image, update references, then delete the old one.',
            code: 'IMAGE_REPLACE_DISABLED',
        },
        405,
    )

// ── DELETE：刪圖（draft 或 published） ──────────────────────────────────
export const DELETE: APIRoute = async ({ request, params }) => {
    if (!params.id) return json({ error: 'ID is required' }, 400)

    const idResult = z.uuid().safeParse(params.id)
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