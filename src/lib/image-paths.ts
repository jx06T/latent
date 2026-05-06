/**
 * 圖片路徑與 URL 的單一真實來源。
 * SSR 渲染、background function、GC、markdown 匯出都應透過此模組。
 *
 * R2 路徑規則：
 *   draft     : drafts/{project_id}/{id}.{source_ext}
 *   published : projects/{project_id}/{size}/{id}.{published_ext}
 */

export type ImageStatus = 'draft' | 'published'

export interface ProjectImageRow {
    id: string
    project_id: string
    status: ImageStatus
    source_ext: string
    published_ext: string | null
    available_sizes: string[] | null
}

const CDN_DOMAIN = (() => {
    const d = import.meta.env.PUBLIC_R2_CDN_URL ??
        (typeof process !== 'undefined' ? process.env.PUBLIC_R2_CDN_URL : undefined) ?? ''
    return d.replace(/\/+$/, '')
})()

// ── 路徑生成 ──────────────────────────────────────────────────────────────

export function draftKey(projectId: string, imageId: string, sourceExt: string): string {
    return `drafts/${projectId}/${imageId}.${sourceExt}`
}

export function publishedKey(
    projectId: string,
    imageId: string,
    publishedExt: string,
    size: string,
): string {
    return `projects/${projectId}/${size}/${imageId}.${publishedExt}`
}

/**
 * 列出一張圖在 R2 上實際存在的所有路徑（供 GC / DELETE 使用）。
 */
export function allKeysFor(image: ProjectImageRow): string[] {
    if (image.status === 'draft') {
        return [draftKey(image.project_id, image.id, image.source_ext)]
    }
    if (!image.published_ext || !image.available_sizes?.length) return []
    return image.available_sizes.map(size =>
        publishedKey(image.project_id, image.id, image.published_ext!, size),
    )
}

// ── URL 生成 ──────────────────────────────────────────────────────────────

export function toCdnUrl(key: string): string {
    if (!CDN_DOMAIN) throw new Error('PUBLIC_R2_DOMAIN is not configured')
    return `${CDN_DOMAIN}/${key}`
}

export function publishedUrl(image: ProjectImageRow, size?: string): string {
    if (image.status !== 'published' || !image.published_ext || !image.available_sizes?.length) {
        throw new Error(`Image ${image.id} is not published`)
    }
    const chosen = size && image.available_sizes.includes(size)
        ? size
        : image.available_sizes.includes('md')
            ? 'md'
            : image.available_sizes[0]
    return toCdnUrl(publishedKey(image.project_id, image.id, image.published_ext, chosen))
}

const SIZE_WIDTHS: Record<string, number> = { sm: 400, md: 800, lg: 1200 }

export function buildSrcset(image: ProjectImageRow): string {
    if (image.status !== 'published' || !image.published_ext || !image.available_sizes?.length) {
        return ''
    }
    return image.available_sizes
        .filter(s => s in SIZE_WIDTHS)
        .map(s => {
            const url = toCdnUrl(publishedKey(image.project_id, image.id, image.published_ext!, s))
            return `${url} ${SIZE_WIDTHS[s]}w`
        })
        .join(', ')
}