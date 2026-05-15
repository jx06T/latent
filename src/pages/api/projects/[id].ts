/**
 * DELETE /api/projects/:id
 *   - 刪除 project 及其所有 R2 檔案
 *   - processing 期間禁止
 *   - 流程：列出所有 image 路徑 → 批次刪 R2 → 刪 project（CASCADE 自動刪 project_images）
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
            'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    })

export const DELETE: APIRoute = async ({ request, params }) => {
    if (!params.id) return json({ error: 'ID is required' }, 400)

    const idResult = z.uuid().safeParse(params.id)
    if (!idResult.success) return json({ error: 'Invalid id' }, 400)
    const projectId = idResult.data

    // 1. JWT
    const auth = request.headers.get('Authorization')
    if (!auth?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

    let userId: string
    try { userId = await verifyToken(auth.slice(7)) }
    catch { return json({ error: 'Unauthorized' }, 401) }

    const db = createServiceClient()

    // 2. 確認所有權與狀態
    const { data: project } = await db
        .from('projects')
        .select('id, author_id, status')
        .eq('id', projectId)
        .single()

    if (!project) return json({ error: 'Project not found' }, 404)
    if (project.author_id !== userId) return json({ error: 'Forbidden' }, 403)
    if (project.status === 'processing') {
        return json({ error: 'Project is currently processing' }, 409)
    }

    // 3. 撈所有相關 image，列出 R2 路徑
    const { data: images, error: imgErr } = await db
        .from('project_images')
        .select('id, project_id, status, source_ext, published_ext, available_sizes')
        .eq('project_id', projectId)

    if (imgErr) {
        console.error('[projects DELETE] fetch images failed:', imgErr)
        return json({ error: 'Database error' }, 500)
    }

    const allKeys = (images ?? []).flatMap(img =>
        allKeysFor(img as unknown as ProjectImageRow),
    )

    // 4. 批次刪 R2（失敗只 log，不阻擋；殘留檔靠 lifecycle 兜底）
    if (allKeys.length > 0) {
        try { await deleteR2Objects(allKeys) }
        catch (err) { console.error('[projects DELETE] R2 cleanup failed:', err) }
    }

    // 5. 刪 project（CASCADE 自動刪 project_images）
    const { error: delErr } = await db
        .from('projects')
        .delete()
        .eq('id', projectId)

    if (delErr) {
        console.error('[projects DELETE] db delete failed:', delErr)
        return json({ error: 'Database error' }, 500)
    }

    return json({ message: 'Deleted', project_id: projectId })
}