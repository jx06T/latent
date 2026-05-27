import type { APIRoute } from 'astro'
import { verifyToken } from '@/lib/supabase-server'
import { createGameServiceClient } from '@/lib/supabase-game'

const ORIGIN = import.meta.env.PUBLIC_SITE_URL
const cors = { 
  'Content-Type': 'application/json', 
  'Access-Control-Allow-Origin': ORIGIN || '*' 
}

export const OPTIONS: APIRoute = () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })

export const GET: APIRoute = async ({ request }) => {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors })
  }

  try {
    const userId = await verifyToken(auth.slice(7))
    const db = createGameServiceClient()

    // 1. 取得使用者所屬的隊伍與啟動時間
    const { data: member } = await db
      .from('game_team_members')
      .select('team_id, game_teams(activated_at)')
      .eq('user_id', userId)
      .maybeSingle() as any

    if (!member || !member.game_teams?.activated_at) {
      return new Response(JSON.stringify({ error: 'Access Denied: Team not found or not activated' }), { status: 403, headers: cors })
    }

    // 2. 取得所有進度以計算完成時間
    const { data: progress, count } = await db
      .from('game_team_progress')
      .select('solved_at', { count: 'exact' })
      .eq('team_id', member.team_id)

    if ((count ?? 0) < 11 || !progress) {
      return new Response(JSON.stringify({ error: 'Access Denied: Incomplete Progress' }), { status: 403, headers: cors })
    }

    // 3. 計算數據
    const startTime = new Date(member.game_teams.activated_at).getTime()
    const endTime = Math.max(...progress.map(p => new Date(p.solved_at!).getTime()))
    const diffSeconds = Math.max(0, Math.floor((endTime - startTime) / 1000))

    // 格式化 %1: mm:ss
    const mins = Math.floor(diffSeconds / 60).toString().padStart(2, '0')
    const secs = (diffSeconds % 60).toString().padStart(2, '0')
    const durationStr = `${mins}:${secs}`

    // 計算 %2: 認知指標 (60min=0.91, 90min=0.73, min=0.43)
    // 公式: 1.27 - (seconds * 0.0001)
    const cognitiveIndex = Math.min(0.98, Math.max(0.43, 1.27 - diffSeconds * 0.0001)).toFixed(2)

    // 4. 處理結局內容替換
    const defaultTemplate = `VERIFICATION COMPLETE.
Assessment duration: %1
Subject cognitive index: %2
Classification revised: [DISPOSABLE] => [OBSERVATION SUBJECT].
Erasure Procedure: suspended.
[LATENT_MODE ACTIVATED]
We will keep watching.`

    let finalContent = (import.meta.env.GAME_ENDING_CONTENT || defaultTemplate)
      .replace('%1', durationStr)
      .replace('%2', cognitiveIndex)

    return new Response(JSON.stringify({
      content: finalContent,
      timestamp: new Date().toISOString()
    }), { status: 200, headers: cors })

  } catch (e) {
    console.error('[api/game/get-ending] error:', e)
    return new Response(null, { status: 500, headers: cors })
  }
}