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

const BodySchema = z.object({ input_text: z.string().min(1).max(500) })

const RATE_LIMIT_WINDOW_SECONDS = 60
const RATE_LIMIT_MAX_WRONG = 10

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
  const { input_text } = parsed.data

  const db = createGameServiceClient()

  // Get user's team
  const { data: member } = await db
    .from('game_team_members')
    .select('team_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!member) return json({ error: 'not_in_team' }, 403)

  const teamId = member.team_id

  // Check team state
  const { data: team } = await db
    .from('game_teams')
    .select('is_active, is_suspended, activated_at')
    .eq('id', teamId)
    .maybeSingle()

  if (!team) return json({ error: 'team_not_found' }, 404)
  if (team.is_suspended) return json({ error: 'team_suspended' }, 403)
  if (!team.is_active) return json({ error: 'team_not_active' }, 403)

  // Rate limiting: count wrong submissions in the last window
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString()
  const { count: recentWrong } = await db
    .from('game_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_correct', false)
    .gte('submitted_at', windowStart)

  if ((recentWrong ?? 0) >= RATE_LIMIT_MAX_WRONG) {
    return json({ error: 'rate_limited' }, 429)
  }

  // Normalize input
  const normalized = input_text.trim().toLowerCase()

  // Load all puzzles via service_role (bypasses RLS)
  const { data: puzzles, error: puzzlesErr } = await db
    .from('game_puzzles')
    .select('id, correct_answer, message')

  if (puzzlesErr || !puzzles) {
    console.error('[game/submit-answer] load puzzles failed:', puzzlesErr)
    return json({ error: 'Database error' }, 500)
  }

  // Load this team's solved puzzles
  const { data: progress } = await db
    .from('game_team_progress')
    .select('puzzle_id')
    .eq('team_id', teamId)

  const solvedIds = new Set((progress ?? []).map(p => p.puzzle_id))

  // Match normalized input against all puzzles
  const match = puzzles.find(
    p => p.correct_answer.trim().toLowerCase() === normalized
  )

  if (!match) {
    await db.from('game_submissions').insert({
      team_id: teamId,
      user_id: userId,
      input_text,
      matched_puzzle: null,
      is_correct: false,
    })
    return json({ status: 'incorrect' })
  }

  if (solvedIds.has(match.id)) {
    return json({ status: 'already_solved', message: match.message ?? null, puzzle_id: match.id })
  }

  // Correct and unsolved — record progress + submission
  const [progressInsert, submissionInsert] = await Promise.all([
    db.from('game_team_progress').insert({
      team_id: teamId,
      puzzle_id: match.id,
      solved_by: userId,
    }),
    db.from('game_submissions').insert({
      team_id: teamId,
      user_id: userId,
      input_text,
      matched_puzzle: match.id,
      is_correct: true,
    }),
  ])

  if (progressInsert.error) {
    console.error('[game/submit-answer] insert progress failed:', progressInsert.error)
    return json({ error: 'Database error' }, 500)
  }
  if (submissionInsert.error) {
    console.error('[game/submit-answer] insert submission failed:', submissionInsert.error)
  }

  return json({ status: 'correct', puzzle_id: match.id, message: match.message ?? null })
}
