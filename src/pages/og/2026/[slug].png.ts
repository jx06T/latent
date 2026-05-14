import type { APIRoute } from 'astro'
import satori from 'satori'
import sharp from 'sharp'
import { createElement } from 'react'
import { OgImage } from '@/lib/og-image'
import { supabase } from '@/lib/supabase'
import { CATEGORIES } from '@/lib/schema'
import type { CategoryId } from '@/lib/schema'

export const prerender = false

// UbuntuMono: stable, cache across requests
let latinFontCache: ArrayBuffer | null = null

async function loadLatinFont(origin: string): Promise<ArrayBuffer> {
  if (latinFontCache) return latinFontCache
  const res = await fetch(`${origin}/fonts/UbuntuMono-R.ttf`)
  if (!res.ok) throw new Error(`Latin font fetch failed: ${res.status}`)
  latinFontCache = await res.arrayBuffer()
  return latinFontCache
}

// Noto Sans TC: fetch only the glyphs needed for this request's text.
// IE11 UA → Google Fonts returns WOFF (not WOFF2); Satori supports WOFF but not WOFF2.
async function loadCJKSubset(text: string): Promise<ArrayBuffer[]> {
  try {
    const cssRes = await fetch(
      `https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400&text=${encodeURIComponent(text)}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko',
        },
      },
    )
    const css = await cssRes.text()

    const urls = [...css.matchAll(/src: url\((.+?)\) format\('woff'\)/g)].map((m) => m[1])

    return Promise.all(urls.map((u) => fetch(u).then((r) => r.arrayBuffer())))
  } catch (err) {
    console.error('[OG font] loadCJKSubset failed:', err)
    return []
  }
}

export const GET: APIRoute = async ({ params, url }) => {
  const { slug } = params
  if (!slug || !/^[a-zA-Z0-9-]+$/.test(slug)) {
    return new Response(null, { status: 404 })
  }

  const { data, error } = await supabase
    .from('projects')
    .select('title, description, author_handle, category_main')
    .eq('year', 2026)
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (error || !data) {
    return new Response(null, { status: 404 })
  }

  const categoryLabel = CATEGORIES[data.category_main as CategoryId] ?? '未分類'

  try {
    const contentText = [data.title, data.description, categoryLabel].filter(Boolean).join(' ')

    const [latinFont, cjkFonts] = await Promise.all([
      loadLatinFont(url.origin),
      loadCJKSubset(contentText),
    ])

    const fonts: Parameters<typeof satori>[1]['fonts'] = [
      { name: 'UbuntuMono', data: latinFont, weight: 400, style: 'normal' },
      ...cjkFonts.map((d) => ({ name: 'NotoSansTC', data: d, weight: 400 as const, style: 'normal' as const })),
    ]

    const element = createElement(OgImage, {
      title: data.title,
      description: data.description,
      authorHandle: data.author_handle,
      categoryLabel,
    })

    const svg = await satori(element, { width: 1200, height: 630, fonts })
    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer()

    return new Response(new Uint8Array(pngBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      },
    })
  } catch (err) {
    console.error('[OG image]', err)
    return new Response(null, { status: 500 })
  }
}
