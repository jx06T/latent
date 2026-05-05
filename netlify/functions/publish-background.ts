/**
 * Netlify Background Function
 * 由 /api/publish 觸發，執行耗時的圖片處理流程：
 *   1. 從 R2 下載草稿原圖
 *   2. Sharp 產出 sm/md/lg 三尺寸 WebP
 *   3. 上傳至 R2 processed/
 *   4. 替換 Markdown 中的 image-id 為正式 URL
 *   5. 刪除 R2 草稿原圖
 *   6. 更新 DB 狀態為 published
 */
import type { Handler } from '@netlify/functions'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'

// ── 型別 ─────────────────────────────────────────────────────────────────────
interface Payload {
  project_id: string
  author_id:  string
}

const SIZES = [
  { name: 'sm', width: 400  },
  { name: 'md', width: 800  },
  { name: 'lg', width: 1200 },
] as const

// ── R2 工具（自包含，使用 process.env）────────────────────────────────────────
function createS3() {
  const accountId = process.env.R2_ACCOUNT_ID!
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

const BUCKET = () => process.env.R2_BUCKET_NAME ?? 'latent-img'

async function downloadFromR2(key: string): Promise<Buffer> {
  const res = await createS3().send(new GetObjectCommand({ Bucket: BUCKET(), Key: key }))
  if (!res.Body) throw new Error(`Empty R2 body: ${key}`)
  const chunks: Uint8Array[] = []
  for await (const chunk of res.Body as AsyncIterable<Uint8Array>) chunks.push(chunk)
  return Buffer.concat(chunks)
}

async function uploadToR2(key: string, data: Buffer, contentType: string) {
  await createS3().send(
    new PutObjectCommand({ Bucket: BUCKET(), Key: key, Body: data, ContentType: contentType }),
  )
}

async function deleteFromR2(key: string) {
  await createS3().send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: key }))
}

// ── Supabase（service role）──────────────────────────────────────────────────
function createSupa() {
  return createClient(
    process.env.PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

// ── Handler ──────────────────────────────────────────────────────────────────
export const handler: Handler = async event => {
  // ── 安全驗證（僅接受內部呼叫）─────────────────────────────────────────────
  const receivedToken = event.headers['x-internal-token'] ?? ''
  const expectedToken = process.env.INTERNAL_TOKEN ?? ''
  if (!expectedToken || receivedToken !== expectedToken) {
    console.error('[publish-background] unauthorized call')
    return { statusCode: 401, body: 'Unauthorized' }
  }

  let payload: Payload
  try {
    payload = JSON.parse(event.body ?? '{}') as Payload
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' }
  }

  const { project_id, author_id } = payload
  if (!project_id || !author_id) return { statusCode: 400, body: 'Missing project_id or author_id' }

  const db        = createSupa()
  const publicUrl = process.env.R2_PUBLIC_URL ?? ''

  console.log(`[publish-background] start project=${project_id}`)

  try {
    // ── 1. 取得所有草稿圖片 ───────────────────────────────────────────────
    const { data: images, error: fetchErr } = await db
      .from('project_images')
      .select('id, storage_key, image_type')
      .eq('project_id', project_id)
      .eq('status', 'draft')

    if (fetchErr) throw fetchErr
    if (!images || images.length === 0) {
      console.log('[publish-background] no draft images, marking published')
    }

    // ── 2. 取得當前 Markdown 內容 ─────────────────────────────────────────
    const { data: project, error: projErr } = await db
      .from('projects')
      .select('content')
      .eq('id', project_id)
      .single()

    if (projErr || !project) throw projErr ?? new Error('Project not found')
    let content: string = project.content ?? ''

    // ── 3. 逐張處理草稿圖片 ──────────────────────────────────────────────
    for (const img of images ?? []) {
      if (img.image_type !== 'content') continue

      // 從 storage_key 提取 uuid（drafts/{pid}/{uuid}.ext）
      const uuidMatch = img.storage_key.match(/\/([0-9a-f-]{36})\.[a-z]+$/i)
      if (!uuidMatch) {
        console.warn(`[publish-background] cannot parse uuid from key: ${img.storage_key}`)
        continue
      }
      const imageId = uuidMatch[1]

      // 下載原圖
      const original = await downloadFromR2(img.storage_key)

      // Sharp 產出三尺寸 WebP
      await Promise.all(
        SIZES.map(async ({ name, width }) => {
          const processed = await sharp(original)
            .resize(width, undefined, { withoutEnlargement: true })
            .webp({ quality: 85 })
            .toBuffer()

          const key = `processed/${project_id}/${name}/${imageId}.webp`
          await uploadToR2(key, processed, 'image/webp')
        }),
      )

      // 替換 Markdown 中的 image-id 為正式 md 尺寸 URL
      const finalUrl = `${publicUrl}/processed/${project_id}/md/${imageId}.webp`
      content = content.replaceAll(`(${imageId})`, `(${finalUrl})`)

      // 標記為已發布
      await db
        .from('project_images')
        .update({ status: 'published', storage_key: `processed/${project_id}/md/${imageId}.webp` })
        .eq('id', img.id)

      // 毀屍滅跡：刪除 R2 草稿原圖
      await deleteFromR2(img.storage_key)

      console.log(`[publish-background] processed image ${imageId}`)
    }

    // ── 4. 更新 Markdown 內容與專案狀態 ──────────────────────────────────
    await db
      .from('projects')
      .update({ content, status: 'published' })
      .eq('id', project_id)

    console.log(`[publish-background] done project=${project_id}`)
    return { statusCode: 200, body: 'OK' }
  } catch (err) {
    console.error('[publish-background] error:', err)

    // 回滾狀態為 draft，讓使用者可以重試
    await db.from('projects').update({ status: 'draft' }).eq('id', project_id)

    return { statusCode: 500, body: 'Internal error' }
  }
}
