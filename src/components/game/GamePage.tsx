import React, { useEffect, useState } from 'react'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth' // 引入 useSupabaseAuth
import { gameSupabase } from '@/lib/supabase-game' // 引入前端 Supabase 客戶端
import AuthGate from '@/components/ui/AuthGate' // 引入 AuthGate
import GameTerminal from './GameTerminal'
import Leaderboard from './Leaderboard'
import type { Tables } from '@/lib/database.types'

type TeamRow = Tables<'game_teams'>
interface PlayerData extends TeamRow { name: string }

export default function GamePage() {
  const { accessToken, user, loading: authLoading, isLoggedIn, signIn, signOut } = useSupabaseAuth()
  const [gameState, setGameState] = useState<'loading' | 'unauthorized' | 'ready'>('loading')
  const [playerData, setPlayerData] = useState<PlayerData | null>(null)

  useEffect(() => {
    // 1. 如果認證還在讀取，或者根本沒登入，不執行檢查
    if (authLoading || !isLoggedIn || !user) {
      return
    }

    // 只有在 auth 完成加載且使用者已登入時，才執行隊伍狀態檢查
    const checkPlayerStatus = async () => {
      try {
        // 直接從 game_team_members 查詢，RLS 會過濾非本人或非所屬隊伍的資料
        const { data: member, error: memberError } = await gameSupabase
          .from('game_team_members')
          .select('team_id, game_teams(*)')
          .eq('user_id', user.id)
          .maybeSingle()

        if (memberError) throw memberError

        if (!member) { 
          window.location.replace('/game/join') // 未授權則直接重定向
        } else {
          const team = member.game_teams as unknown as TeamRow
          const data: PlayerData = {
            ...team,
            name: user.email?.split('@')[0] || 'RESEARCHER', // 暫時用 email 當名字
          }
          setPlayerData(data)
          setGameState('ready')
        }
      } catch (err) {
        console.error('檢查玩家狀態時發生錯誤:', err);
        // window.location.href = '/game/join'; // 網路或其他錯誤時導向加入隊伍頁面
      }
    }

    checkPlayerStatus()
  }, [user, accessToken, authLoading, isLoggedIn])

  return (
    <AuthGate
      loading={authLoading}
      loggedIn={isLoggedIn}
      onSignIn={signIn}
      loadingText="VERIFYING_IDENTITY..."
      title="RESEARCH TERMINAL"
      message="Please sign in to access the terminal."
    >
      {gameState === 'loading' ? (
        <div className="flex h-screen items-center justify-center font-mono text-ink/50 uppercase">
          Loading_Team_Session...
        </div>
      ) : !playerData ? (
        null
      ) : (
        <div className="min-h-screen font-mono p-4 md:p-8">
          {/* 頂部操作列 */}
          <div className="max-w-6xl mx-auto flex justify-end mb-4">
            <button
              onClick={() => signOut()}
              className="text-[10px] text-ink-muted hover:text-ink transition-colors border border-line px-2 py-1 uppercase tracking-widest"
            >
              Sign Out
            </button>
          </div>

          <main className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-12 gap-6">
            {/* 左側：研究終端與解題介面 */}
            <div className="sm:col-span-8 shadow-2xl">
              <GameTerminal team={playerData} />
            </div>
            
            {/* 右側：排行榜 */}
            <div className="sm:col-span-4 flex flex-col gap-6">
              <div className="border border-line p-5 bg-bg-surface/30">
                <Leaderboard />
              </div>
            </div>
          </main>
        </div>
      )}
    </AuthGate>
  )
}