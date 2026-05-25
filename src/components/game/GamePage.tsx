import { useEffect, useState } from 'react'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { gameSupabase } from '@/lib/supabase-game'
import AuthGate from '@/components/ui/AuthGate'
import JoinTeamForm from './JoinTeamForm'
import GameTerminal from './GameTerminal'

interface TeamInfo {
  id: string
  team_code: string
  group_name: string | null
  activated_at: string | null
}

export default function GamePage() {
  const { user, loading, isLoggedIn, accessToken, signIn } = useSupabaseAuth()
  const [team, setTeam] = useState<TeamInfo | null | undefined>(undefined)
  const [teamLoading, setTeamLoading] = useState(false)

  // Read ?code= from URL for QR join flow
  const code = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('code') ?? undefined
    : undefined

  useEffect(() => {
    if (!isLoggedIn || !user) {
      setTeam(null)
      return
    }
    let cancelled = false
    setTeamLoading(true)
    gameSupabase
      .from('game_team_members')
      .select('team_id, game_teams(id, team_code, group_name, activated_at)')
      .eq('user_id', user.id)
      .maybeSingle()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data }: { data: any }) => {
        if (cancelled) return
        if (data?.game_teams) {
          const t = data.game_teams as unknown as TeamInfo
          setTeam(t)
        } else {
          setTeam(null)
        }
        setTeamLoading(false)
      })
    return () => { cancelled = true }
  }, [isLoggedIn, user])

  const isLoading = loading || (isLoggedIn && teamLoading)

  return (
    <AuthGate
      loading={isLoading}
      loggedIn={isLoggedIn}
      onSignIn={() => signIn('/game/' + (code ? `?code=${code}` : ''))}
      title="LATENT 2026"
      message="需要登入才能參與遊戲"
      loadingText="載入中..."
    >
      {team === undefined || teamLoading ? (
        <div className="min-h-screen flex items-center justify-center bg-bg font-mono text-ink-muted text-sm">
          <span className="animate-pulse">載入中...</span>
        </div>
      ) : team === null ? (
        <JoinTeamForm
          code={code}
          onJoined={(teamInfo) => setTeam(teamInfo)}
        />
      ) : (
        <GameTerminal team={team} />
      )}
    </AuthGate>
  )
}
