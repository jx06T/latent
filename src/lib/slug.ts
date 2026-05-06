const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9]|-(?!-))*[a-z0-9]$/

export function isValidSlug(slug: string): boolean {
  if (slug.length < 3 || slug.length > 60) return false
  return SLUG_PATTERN.test(slug)
}

export function toSlugSuggestion(title: string): string {
  return title
    .toLowerCase()
    .replace(/[一-鿿　-〿]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}
