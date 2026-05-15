import type { APIRoute } from 'astro'
import { createServiceClient } from '@/lib/supabase-server'

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null)

  const name = (body?.name ?? '').trim()
  const email = (body?.email ?? '').trim()
  const subject = (body?.subject ?? '').trim()
  const message = (body?.message ?? '').trim()

  if (!name || !email || !message) return json({ error: '請填寫必要欄位（名字、Email、訊息）' }, 400)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: '請填寫有效的 Email 地址' }, 400)
  if (message.length > 2000) return json({ error: '訊息不得超過 2000 字' }, 400)

  const db = createServiceClient()
  const { error } = await (db as any)
    .from('contact_messages')
    .insert({ name, email, subject: subject || null, message })

  if (error) return json({ error: error.message }, 500)
  return json({ ok: true }, 201)
}

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
