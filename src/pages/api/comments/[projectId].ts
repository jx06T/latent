import type { APIRoute } from 'astro'
import { createAnonClient, createUserClient, verifyToken } from '@/lib/supabase-server'

export const GET: APIRoute = async ({ params }) => {
  const { projectId } = params
  if (!projectId) return json({ error: 'Missing projectId' }, 400)

  const db = createAnonClient()

  // Two queries: comments + profiles for users who have one
  const { data: rows, error } = await db
    .from('comments')
    .select('id, content, created_at, user_id')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) return json({ error: error.message }, 500)
  if (!rows?.length) return json([], 200)

  const userIds = [...new Set(rows.map(r => r.user_id))]
  const { data: profiles } = await db
    .from('profiles')
    .select('id, handle, nickname')
    .in('id', userIds)

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

  const comments = rows.map(r => ({
    ...r,
    author: profileMap[r.user_id]
      ? { handle: profileMap[r.user_id].handle, nickname: profileMap[r.user_id].nickname }
      : null,
  }))

  return json(comments, 200)
}

export const POST: APIRoute = async ({ params, request }) => {
  const { projectId } = params
  if (!projectId) return json({ error: 'Missing projectId' }, 400)

  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return json({ error: 'Unauthorized' }, 401)

  let userId: string
  try {
    userId = await verifyToken(token)
  } catch {
    return json({ error: 'Unauthorized' }, 401)
  }

  const body = await request.json().catch(() => null)
  const content = (body as any)?.content?.trim()
  if (!content) return json({ error: '留言不能為空' }, 400)
  if (content.length > 500) return json({ error: '留言不能超過 500 字' }, 400)

  // Insert using user-scoped client so RLS auth.uid() resolves correctly
  const db = createUserClient(token)
  const { data: row, error } = await db
    .from('comments')
    .insert({ project_id: projectId, user_id: userId, content })
    .select('id, content, created_at, user_id')
    .single()

  if (error) return json({ error: error.message }, 500)

  // Fetch author profile (if exists) for the response
  const anonDb = createAnonClient()
  const { data: profile } = await anonDb
    .from('profiles')
    .select('handle, nickname')
    .eq('id', userId)
    .maybeSingle()

  return json(
    {
      ...row,
      author: profile ? { handle: profile.handle, nickname: profile.nickname } : null,
    },
    201,
  )
}

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
