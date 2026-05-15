import type { APIRoute } from 'astro'
import satori from 'satori'
import sharp from 'sharp'
import { createElement } from 'react'
import { OgImage } from '@/lib/og-image'
import { supabase } from '@/lib/supabase'
import { CATEGORIES } from '@/lib/schema'
import type { CategoryId } from '@/lib/schema'

export const prerender = false

// 1. 全域快取：除了英文字體，我們把 Google Fonts 的 WOFF 檔案也快取起來
// 因為 Google 是把字體切成很多小塊(Chunks)，不同專案常會共用到同一塊
let latinFontCache: ArrayBuffer | null = null
const cjkWoffCache = new Map<string, ArrayBuffer>()

async function loadLatinFont(origin: string): Promise<ArrayBuffer> {
  if (latinFontCache) return latinFontCache
  const res = await fetch(`${origin}/fonts/UbuntuMono-R.ttf`)
  if (!res.ok) throw new Error(`Latin font fetch failed: ${res.status}`)
  latinFontCache = await res.arrayBuffer()
  return latinFontCache
}

async function loadCJKSubset(text: string): Promise<ArrayBuffer[]> {
  try {
    const cssRes = await fetch(
      `https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400&text=${encodeURIComponent(text)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko',
        },
      }
    )
    const css = await cssRes.text()
    const urls = [...css.matchAll(/src: url\((.+?)\) format\('woff'\)/g)].map((m) => m[1])

    // 利用 Map 快取已經抓過的 WOFF 區塊，減少重複的外部網路請求
    return Promise.all(
      urls.map(async (u) => {
        if (cjkWoffCache.has(u)) return cjkWoffCache.get(u)!
        const res = await fetch(u)
        const buffer = await res.arrayBuffer()
        cjkWoffCache.set(u, buffer)
        return buffer
      })
    )
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

  // 2. 平行處理 (Parallel Execution)
  // 英文字體不需要等資料庫，直接與 Supabase 查詢同時啟動！
  const latinFontPromise = loadLatinFont(url.origin)

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

    // 等待英文字體與中文字體完成
    const [latinFont, cjkFonts] = await Promise.all([
      latinFontPromise, 
      loadCJKSubset(contentText)
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
    
    // 3. 圖片壓縮優化：改用 JPEG，並開啟 mozjpeg 壓縮
    // OG Image 不需要透明度，JPEG 的生成速度比 PNG 快，且檔案大小通常只有 PNG 的 1/3 到 1/4
    const imgBuffer = await sharp(Buffer.from(svg))
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer()

    return new Response(new Uint8Array(imgBuffer), {
      headers: {
        'Content-Type': 'image/jpeg', // 記得改 Content-Type
        // CDN 快取設定保持不變，非常正確
        'Cache-Control': 'public, max-age=86400, s-maxage=604800', 
      },
    })
  } catch (err) {
    console.error('[OG image]', err)
    return new Response(null, { status: 500 })
  }
}