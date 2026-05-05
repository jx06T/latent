import type { Config, Context } from '@netlify/functions'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'
import {
  S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand,
} from '@aws-sdk/client-s3'

interface Payload {
  project_id: string
  author_id: string
}

interface DraftImage {
  id: string
  project_id: string
  source_ext: string
}

interface ProcessedImage {
  id: string
  draftKey: string
  uploads: Array<{ key: string; body: Buffer }>
  available_sizes: string[]
  published_ext: string
}

const SIZES = [
  { name: 'sm', width: 400 },
  { name: 'md', width: 800 },
  { name: 'lg', width: 1200 },
] as const

const PUBLISHED_EXT = 'webp'
const CONCURRENCY_LIMIT = 4

// ── R2 ────────────────────────────────────────────────────────────────────
function s3() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}
const BUCKET = () => process.env.R2_BUCKET_NAME ?? 'latent-img'

async function r2Head(key: string): Promise<boolean> {
  try {
    await s3().send(new HeadObjectCommand({ Bucket: BUCKET(), Key: key }))
    return true
  } catch { return false }
}
async function r2Get(key: string): Promise<Buffer> {
  const res = await s3().send(new GetObjectCommand({ Bucket: BUCKET(), Key: key }))
  if (!res.Body) throw new Error(`Empty body: ${key}`)
  return Buffer.from(await res.Body.transformToByteArray())
}
async function r2Put(key: string, body: Buffer, contentType: string) {
  await s3().send(new PutObjectCommand({ Bucket: BUCKET(), Key: key, Body: body, ContentType: contentType }))
}
async function r2Delete(key: string) {
  await s3().send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: key }))
}

// ── Path helpers（與 src/lib/image-paths.ts 規則需保持一致） ────────────
function draftKey(projectId: string, id: string, ext: string) {
  return `drafts/${projectId}/${id}.${ext}`
}
function publishedKey(projectId: string, id: string, size: string, ext: string) {
  return `projects/${projectId}/${size}/${id}.${ext}`
}

// ── Concurrency limiter ──────────────────────────────────────────────────
async function mapWithLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++
      if (i >= items.length) return
      results[i] = await fn(items[i])
    }
  })
  await Promise.all(workers)
  return results
}

// ── Supabase ──────────────────────────────────────────────────────────────
function db() {
  return createClient(
    process.env.PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

// ── Handler ───────────────────────────────────────────────────────────────
export default async (req: Request, _ctx: Context) => {
  const expectedToken = process.env.INTERNAL_TOKEN ?? ''
  if (!expectedToken || req.headers.get('x-internal-token') !== expectedToken) {
    console.error('[publish-bg] unauthorized')
    return new Response('Unauthorized', { status: 401 })
  }

  let payload: Payload
  try { payload = await req.json() }
  catch { return new Response('Invalid JSON', { status: 400 }) }

  const { project_id, author_id } = payload
  if (!project_id || !author_id) return new Response('Missing payload', { status: 400 })

  const supa = db()
  console.log(`[publish-bg] start project=${project_id}`)

  const rollback = async () => {
    await supa.from('projects').update({ status: 'draft' }).eq('id', project_id)
  }

  try {
    // Phase 1: 撈 draft 圖
    const { data: drafts, error: fetchErr } = await supa
      .from('project_images')
      .select('id, project_id, source_ext')
      .eq('project_id', project_id)
      .eq('author_id', author_id)
      .eq('status', 'draft')

    if (fetchErr) throw fetchErr
    const draftImages: DraftImage[] = drafts ?? []

    // Phase 2: Lazy verify
    const verified: DraftImage[] = []
    const missingIds: string[] = []
    await mapWithLimit(draftImages, CONCURRENCY_LIMIT, async img => {
      const key = draftKey(img.project_id, img.id, img.source_ext)
      if (await r2Head(key)) verified.push(img)
      else missingIds.push(img.id)
    })

    if (missingIds.length > 0) {
      console.warn(`[publish-bg] removing ${missingIds.length} unverified rows`)
      await supa.from('project_images').delete().in('id', missingIds)
    }

    if (verified.length === 0) {
      const { error: pubErr } = await supa
        .from('projects')
        .update({ status: 'published' })
        .eq('id', project_id)
      if (pubErr) throw pubErr
      console.log(`[publish-bg] done (no images) project=${project_id}`)
      return new Response('OK', { status: 200 })
    }

    // Phase 3: 全處理到記憶體
    const processed: ProcessedImage[] = await mapWithLimit(verified, CONCURRENCY_LIMIT, async img => {
      const dKey = draftKey(img.project_id, img.id, img.source_ext)
      const original = await r2Get(dKey)

      const variants = await Promise.all(
        SIZES.map(async ({ name, width }) => {
          const body = await sharp(original)
            .resize(width, undefined, { withoutEnlargement: true })
            .webp({ quality: 85 })
            .toBuffer()
          const key = publishedKey(img.project_id, img.id, name, PUBLISHED_EXT)
          return { key, body }
        }),
      )

      return {
        id: img.id,
        draftKey: dKey,
        uploads: variants,
        available_sizes: SIZES.map(s => s.name),
        published_ext: PUBLISHED_EXT,
      }
    })

    // Phase 4: 批次上傳 R2
    const uploadedKeys: string[] = []
    try {
      const allUploads = processed.flatMap(p => p.uploads)
      await mapWithLimit(allUploads, CONCURRENCY_LIMIT, async u => {
        await r2Put(u.key, u.body, 'image/webp')
        uploadedKeys.push(u.key)
      })
    } catch (uploadErr) {
      console.error('[publish-bg] phase 4 failed, cleaning up:', uploadErr)
      await Promise.allSettled(uploadedKeys.map(k => r2Delete(k)))
      throw uploadErr
    }

    // Phase 5: 批次更新 DB
    try {
      await mapWithLimit(processed, CONCURRENCY_LIMIT, async p => {
        const { error } = await supa
          .from('project_images')
          .update({
            status: 'published',
            published_ext: p.published_ext,
            available_sizes: p.available_sizes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', p.id)
        if (error) throw error
      })

      const { error: pubErr } = await supa
        .from('projects')
        .update({ status: 'published' })
        .eq('id', project_id)
      if (pubErr) throw pubErr
    } catch (dbErr) {
      console.error('[publish-bg] phase 5 failed, cleaning up:', dbErr)
      await Promise.allSettled(uploadedKeys.map(k => r2Delete(k)))
      await supa
        .from('project_images')
        .update({ status: 'draft', published_ext: null, available_sizes: null })
        .in('id', processed.map(p => p.id))
      throw dbErr
    }

    // Phase 6: 刪草稿原檔（best-effort）
    await Promise.allSettled(processed.map(p => r2Delete(p.draftKey)))

    console.log(`[publish-bg] done project=${project_id}, images=${processed.length}`)
    return new Response('OK', { status: 202  })

  } catch (err) {
    console.error('[publish-bg] error, rolling back:', err)
    await rollback()
    return new Response('Internal error', { status: 500 })
  }
}

export const config: Config = { path: '/api/publish-background' }