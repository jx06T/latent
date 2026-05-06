/**
 * Markdown 中 ![alt](image-id-xxx) 的解析與替換。
 */
import { buildSrcset, publishedUrl, type ProjectImageRow } from './image-paths'

const IMAGE_ID_PATTERN = /!\[([^\]]*)\]\(image-id-([0-9a-f-]{36})\)/gi

export function replaceImageIds(markdown: string, images: ProjectImageRow[]): string {
    const byId = new Map(images.map(img => [img.id, img]))
    return markdown.replace(IMAGE_ID_PATTERN, (match, alt, id) => {
        const img = byId.get(id)
        if (!img || img.status !== 'published') return match
        const src = publishedUrl(img, 'md')
        const srcset = buildSrcset(img)
        const altEsc = String(alt).replace(/"/g, '&quot;')
        return `<img src="${src}" srcset="${srcset}" sizes="(max-width: 768px) 100vw, 800px" alt="${altEsc}" loading="lazy">`
    })
}

export function exportMarkdownWithUrls(markdown: string, images: ProjectImageRow[]): string {
    const byId = new Map(images.map(img => [img.id, img]))
    return markdown.replace(IMAGE_ID_PATTERN, (match, alt, id) => {
        const img = byId.get(id)
        if (!img || img.status !== 'published') return match
        return `![${alt}](${publishedUrl(img, 'md')})`
    })
}

/**
 * Client-side editor preview: replace image-id refs with URLs from a pre-built map.
 * Keys are raw UUIDs (without the image-id- prefix); values are presigned or CDN URLs.
 * Unresolved refs are left as-is so the editor still shows the raw token.
 */
export function resolveImageIdsToUrls(markdown: string, urlMap: Record<string, string>): string {
    return markdown.replace(IMAGE_ID_PATTERN, (match, alt, id) => {
        const url = urlMap[id]
        if (!url) return match
        return `![${alt}](${url})`
    })
}