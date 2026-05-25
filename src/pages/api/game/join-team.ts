import type { APIRoute } from 'astro'
import { z } from 'zod'
import { verifyToken } from '@/lib/supabase-server'
import { createGameServiceClient } from '@/lib/supabase-game'

const ORIGIN = import.meta.env.PUBLIC_SITE_URL
const cors = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ORIGIN }
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: cors })

export const OPTIONS: APIRoute = () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })

const BodySchema = z.object({ team_code: z.string().min(1).max(64) })

export const POST: APIRoute = async ({ request }) => {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

  let userId: string
  try { userId = await verifyToken(auth.slice(7)) }
  catch { return json({ error: 'Unauthorized' }, 401) }

  let body: unknown
  try { body = await request.json() }
  catch { return json({ error: 'Invalid JSON' }, 400) }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return json({ error: 'Invalid body' }, 400)
  const { team_code } = parsed.data

  const db = createGameServiceClient()

  // Check if already in a team
  const { data: existing } = await db
    .from('game_team_members')
    .select('team_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) return json({ error: 'already_in_team' }, 409)

  // Find the team
  const { data: team } = await db
    .from('game_teams')
    .select('id, team_code, group_name, is_suspended, max_members')
    .eq('team_code', team_code)
    .maybeSingle()

  if (!team) return json({ error: 'team_not_found' }, 404)
  if (team.is_suspended) return json({ error: 'team_suspended' }, 403)

  // Count current members
  const { count } = await db
    .from('game_team_members')
    .select('user_id', { count: 'exact', head: true })
    .eq('team_id', team.id)

  if ((count ?? 0) >= (team.max_members ?? 10)) return json({ error: 'team_full' }, 409)

  const isFirst = (count ?? 0) === 0

  // Insert member
  const { error: insertErr } = await db
    .from('game_team_members')
    .insert({ user_id: userId, team_id: team.id, is_first: isFirst })

  if (insertErr) {
    console.error('[game/join-team] insert member failed:', insertErr)
    return json({ error: 'Database error' }, 500)
  }

  // Activate team on first member
  if (isFirst) {
    const { error: activateErr } = await db
      .from('game_teams')
      .update({ is_active: true, activated_at: new Date().toISOString() })
      .eq('id', team.id)

    if (activateErr) console.error('[game/join-team] activate team failed:', activateErr)
  }

  return json({ team_id: team.id, team_code: team.team_code, group_name: team.group_name })
}
