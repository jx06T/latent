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