import { useState, useEffect, useRef } from 'react'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import type { Tables } from '@/lib/database.types'

type TeamInfo = Tables<'game_teams'>

interface Props {
  code?: string
  onJoined?: (team: TeamInfo) => void
}

const ERROR_MESSAGES: Record<string, string> = {
  already_in_team: '你已經加入一支隊伍了',
  team_not_found:  '找不到這支隊伍，請確認 QR 碼正確',
  team_suspended:  '這支隊伍已被暫停，請聯繫工作人員',
  team_full:       '這支隊伍已達人數上限',
  Unauthorized:    '登入狀態異常，請重新整理頁面',
}

export default function JoinTeamForm({ code, onJoined }: Props) {
  const { accessToken } = useSupabaseAuth()
  const [inputCode, setInputCode] = useState(code ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const autoJoined = useRef(false)

  // 自動處理：若有 code 且已取得 token，則自動觸發
  useEffect(() => {
    if (code && accessToken && !autoJoined.current) {
      autoJoined.current = true
      handleJoin(code)
    }
  }, [code, accessToken])

  async function handleJoin(overrideCode?: string) {
    const trimmed = (overrideCode ?? inputCode).trim()
    if (!trimmed) return
    if (!accessToken) { setError('登入狀態異常，請重新整理頁面'); return }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/game/join-team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ team_code: trimmed }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(ERROR_MESSAGES[data.error] ?? '發生未知錯誤，請稍後再試')
        return
      }

      setSuccess('成功加入！正在進入研究終端...')
      
      onJoined?.({ 
        id: data.team_id, 
        team_code: data.team_code, 
        team_name: data.team_name, 
        activated_at: null,
        is_active: true
      } as TeamInfo)
      
      // 成功加入後，延遲一小段時間讓使用者看見狀態，然後重定向至主遊戲頁面
      setTimeout(() => {
        window.location.href = '/game/'
      }, 1500)
    } catch {
      setError('網路錯誤，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg font-mono p-4">
      <div className="border border-line w-full max-w-sm">
        <div className="border-b border-line px-4 py-2 text-xs text-ink-muted uppercase tracking-widest">
          LATENT 2026 // JOIN TEAM
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <label htmlFor="team-code" className="text-xs text-ink-muted uppercase tracking-wider">
              邀請代碼
            </label>
            <input
              id="team-code"
              type="text"
              value={inputCode}
              onChange={e => setInputCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="TEAM-ALPHA"
              className="w-full bg-transparent border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent-500 uppercase placeholder:normal-case placeholder:text-ink-muted"
              disabled={loading || !!success}
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 border border-red-900 px-3 py-2">{error}</p>
          )}

          {success && (
            <p className="text-xs text-emerald-400 border border-emerald-900 px-3 py-2 animate-pulse">
              {success}
            </p>
          )}

          <button
            onClick={() => handleJoin()}
            disabled={loading || !inputCode.trim() || !!success}
            className="w-full border border-line px-4 py-2 text-sm text-ink hover:border-accent-500 hover:text-accent-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? '處理中...' : success ? '已登記' : '加入隊伍 →'}
          </button>
        </div>
      </div>
    </div>
  )
}
