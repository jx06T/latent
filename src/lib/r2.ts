import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// 建立 R2 S3-compatible 客戶端（使用 import.meta.env，由 Vite/Astro 注入）
function createClient() {
  const accountId  = import.meta.env.R2_ACCOUNT_ID
  const accessKey  = import.meta.env.R2_ACCESS_KEY_ID
  const secretKey  = import.meta.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKey || !secretKey) {
    throw new Error('R2 credentials are not configured (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)')
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  })
}

function bucket(): string {
  return import.meta.env.R2_BUCKET_NAME ?? 'latent-img'
}

/** 產生 Presigned GET URL（預設 1 小時有效），供編輯器預覽草稿圖片 */
export async function generatePresignedGetUrl(
  key: string,
  expiresIn = 3600,
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: bucket(), Key: key })
  return getSignedUrl(createClient(), command, { expiresIn })
}

/** 產生 Presigned PUT URL（5 分鐘有效），供前端直傳 R2 */
export async function generatePresignedPutUrl(
  key: string,
  contentType: string,
  contentLength: number,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  })
  return getSignedUrl(createClient(), command, { expiresIn: 300 })
}

/** 批次刪除 R2 物件 */
export async function deleteR2Objects(keys: string[]): Promise<void> {
  const client = createClient()
  await Promise.all(
    keys.map(key =>
      client.send(new DeleteObjectCommand({ Bucket: bucket(), Key: key })),
    ),
  )
}

/** 下載 R2 物件為 Buffer（背景函式使用） */
export async function getR2ObjectAsBuffer(key: string): Promise<Buffer> {
  const response = await createClient().send(
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
  )
  if (!response.Body) throw new Error(`Empty body for R2 key: ${key}`)

  const chunks: Uint8Array[] = []
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

/** 上傳 Buffer 至 R2 */
export async function putR2Object(
  key: string,
  data: Buffer,
  contentType: string,
): Promise<void> {
  await createClient().send(
    new PutObjectCommand({ Bucket: bucket(), Key: key, Body: data, ContentType: contentType }),
  )
}
