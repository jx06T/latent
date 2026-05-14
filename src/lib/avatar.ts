const STYLE = 'bottts-neutral'

export function getAvatarUrl(seedOrUrl: string | null | undefined, fallback = 'default'): string {
  const seed = seedOrUrl?.trim() || fallback
  if (seed.startsWith('https://')) return seed
  return `https://api.dicebear.com/9.x/${STYLE}/svg?seed=${encodeURIComponent(seed)}`
}
