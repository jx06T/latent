/**
 * Netlify Background Function (V2 Syntax)
 * 由 /api/publish 觸發，執行耗時的圖片處理流程：
 *   1. 從 R2 下載草稿原圖
 *   2. Sharp 產出 sm/md/lg 三尺寸 WebP (封面圖只需 lg)
 *   3. 上傳至 R2 processed/
 *   4. 替換 Markdown 中的 image-id / 更新 cover_image
 *   5. 刪除 R2 草稿原圖
 *   6. 更新 DB 狀態為 published
 */
import type { Config, Context } from '@netlify/functions'
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
  author_id: string
}

const SIZES = [
  { name: 'sm', width: 400 },
  { name: 'md', width: 800 },
  { name: 'lg', width: 1200 },
] as const

// ── R2 工具 ──────────────────────────────────────────────────────────────────
function createS3() {
  const accountId = process.env.R2_ACCOUNT_ID!
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })
}

const BUCKET = () => process.env.R2_BUCKET_NAME ?? 'latent-img'

async function downloadFromR2(key: string): Promise<Buffer> {
  const res = await createS3().send(new GetObjectCommand({ Bucket: BUCKET(), Key: key }))
  if (!res.Body) throw new Error(`Empty R2 body: ${key}`)

  // AWS SDK v3 提供的新方法，直接轉為 Uint8Array 再轉 Buffer
  const byteArray = await res.Body.transformToByteArray()
  return Buffer.from(byteArray)
}

async function uploadToR2(key: string, data: Buffer, contentType: string) {
  await createS3().send(
    new PutObjectCommand({ Bucket: BUCKET(), Key: key, Body: data, ContentType: contentType })
  )
}

async function deleteFromR2(key: string) {
  await createS3().send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: key }))
}

// ── Supabase (Service Role 繞過 RLS) ───────────────────────────────────────
function createSupa() {
  return createClient(
    process.env.PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ── Handler (Netlify V2 寫法) ────────────────────────────────────────────────
export default async (req: Request, context: Context) => {
  // ── 安全驗證（僅接受內部呼叫）─────────────────────────────────────────────
  const receivedToken = req.headers.get('x-internal-token') ?? ''
  const expectedToken = process.env.INTERNAL_TOKEN ?? ''

  if (!expectedToken || receivedToken !== expectedToken) {
    console.error('[publish-background] Unauthorized call')
    // Background Function 回傳值不會被客戶端收到，但會記錄在 Log 中
    return new Response('Unauthorized', { status: 401 })
  }

  let payload: Payload
  try {
    payload = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { project_id, author_id } = payload
  if (!project_id || !author_id) {
    return new Response('Missing payload', { status: 400 })
  }

  const db = createSupa()
  const publicUrl = process.env.PUBLIC_R2_DOMAIN ?? ''
  let finalCoverUrl: string | null = null

  console.log(`[publish-background] Start project=${project_id}`)

  try {
    // ── 1. 取得所有草稿圖片與當前專案資料 ────────────────────────────────────
    const [
      { data: images, error: fetchErr },
      { data: project, error: projErr }
    ] = await Promise.all([
      db.from('project_images')
        .select('id, storage_key, image_type')
        .eq('project_id', project_id)
        .eq('author_id', author_id)
        .eq('status', 'draft'),

      db.from('projects')
        .select('content, cover_image')
        .eq('id', project_id)
        .eq('author_id', author_id)
        .single()
    ])


    if (fetchErr) throw fetchErr
    if (projErr || !project) {
      throw new Error('Project not found or you are not the owner')
    }

    let content: string = project.content ?? ''
    finalCoverUrl = project.cover_image

    // ── 2. 逐張處理草稿圖片 ──────────────────────────────────────────────
    if (images && images.length > 0) {
      for (const img of images) {
        // 解析 UUID
        const filename = img.storage_key.split('/').pop(); // 拿到 "550e8400-e29b.jpg"
        if (!filename) {
          console.warn(`[publish-background] Cannot parse UUID: ${img.storage_key}`)
          continue;
        }
        const imageId = filename.substring(0, filename.lastIndexOf('.')); // 拿到 "550e8400-e29b"

        // 下載原圖
        const original = await downloadFromR2(img.storage_key)

        if (img.image_type === 'content') {
          // 內文圖：產出三個尺寸
          await Promise.all(
            SIZES.map(async ({ name, width }) => {
              const processed = await sharp(original)
                .resize(width, undefined, { withoutEnlargement: true })
                .webp({ quality: 85 })
                .toBuffer()

              await uploadToR2(`processed/${project_id}/${name}/${imageId}.webp`, processed, 'image/webp')
            })
          )

          // 更新 DB 狀態
          await db.from('project_images').update({ status: 'published', storage_key: `processed/${project_id}/md/${imageId}.webp` }).eq('id', img.id)

        } else if (img.image_type === 'cover') {
          // 封面圖：產出最大尺寸 (lg) 即可
          const processed = await sharp(original)
            .resize(1200, undefined, { withoutEnlargement: true })
            .webp({ quality: 85 })
            .toBuffer()

          const coverPath = `processed/${project_id}/cover/${imageId}.webp`
          await uploadToR2(coverPath, processed, 'image/webp')

          finalCoverUrl = `${publicUrl}/${coverPath}`
          await db.from('project_images').update({ status: 'published', storage_key: coverPath }).eq('id', img.id)
        }

        // 毀屍滅跡：刪除草稿原圖
        await deleteFromR2(img.storage_key)
        console.log(`✅ [publish-background] Processed image ${imageId} (${img.image_type})`)
      }
    } else {
      console.log('[publish-background] No draft images found. Proceeding to publish.')
    }

    // ── 3. 更新 Markdown 內容、封面與專案狀態 ────────────────────────────
    await db
      .from('projects')
      .update({ cover_image: finalCoverUrl, status: 'published' })
      .eq('id', project_id)

    console.log(`[publish-background] Done project=${project_id}`)
    return new Response('OK', { status: 200 })

  } catch (err) {
    console.error('❌ [publish-background] Error:', err)

    // Rollback 狀態為 draft
    await db.from('projects').update({ status: 'draft' }).eq('id', project_id)
    return new Response('Internal error', { status: 500 })
  }
}

// 告訴 Netlify 這是 Background Function
export const config: Config = {
  path: "/api/publish-background",
};