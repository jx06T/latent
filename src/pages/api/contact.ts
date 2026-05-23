import type { APIRoute } from 'astro'
import { createServiceClient } from '@/lib/supabase-server'
import { ipHash, clientIp } from '@/lib/rate-limit'

const WINDOW_MS = 6 * 60 * 60 * 1000  // 6 hours
const IP_LIMIT = 120

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null)

  const name = (body?.name ?? '').trim()
  const email = (body?.email ?? '').trim()
  const subject = (body?.subject ?? '').trim()
  const message = (body?.message ?? '').trim()

  if (!name || !email || !message) return json({ error: '請填寫必要欄位（名字、Email、訊息）' }, 400)
  if (name.length > 100) return json({ error: '名字不得超過 100 字' }, 400)
  if (email.length > 254) return json({ error: 'Email 不得超過 254 字' }, 400)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: '請填寫有效的 Email 地址' }, 400)
  if (subject.length > 200) return json({ error: '主旨不得超過 200 字' }, 400)
  if (message.length > 2000) return json({ error: '訊息不得超過 2000 字' }, 400)

  const db = createServiceClient()
  const since = new Date(Date.now() - WINDOW_MS).toISOString()
  const hash = await ipHash(clientIp(request))

  const { count: ipCount } = await db
    .from('contact_messages')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', hash)
    .gte('created_at', since)

  if ((ipCount ?? 0) >= IP_LIMIT) {
    return json({ error: '請求過於頻繁，請稍後再試' }, 429)
  }

  const { error } = await (db as any)
    .from('contact_messages')
    .insert({ name, email, subject: subject || null, message, ip_hash: hash })

  if (error) return json({ error: '傳送失敗，請稍後再試' }, 500)
  return json({ ok: true }, 201)
}

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
