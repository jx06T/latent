import React, { useEffect, useState } from 'react'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { gameSupabase } from '@/lib/supabase-game'
import AuthGate from '@/components/ui/AuthGate' 

import JoinTeamForm from './JoinTeamForm'

interface JoinPageProps {
  code?: string
}

export default function JoinPage({ code }: JoinPageProps) {
  const { user, loading: authLoading, isLoggedIn, signIn, signOut } = useSupabaseAuth()
  const [gameState, setGameState] = useState<'loading' | 'ready'>('loading')

  useEffect(() => {
    // 1. 如果認證還在讀取，或者根本沒登入，不執行檢查
    if (authLoading || !isLoggedIn || !user) {
      if (!authLoading) setGameState('ready')
      return
    }

    const checkPlayerStatus = async () => {
      try {
        // 檢查使用者是否已經在隊伍中
        const { data: member, error } = await gameSupabase
          .from('game_team_members')
          .select('team_id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (error) throw error

        if (member) {
          // 如果已經有隊伍，直接導向遊戲主頁面
          window.location.replace('/game')
        } else {
          setGameState('ready')
        }
      } catch (err) {
        console.error('檢查玩家狀態時發生錯誤:', err)
        setGameState('ready')
      }
    }

    checkPlayerStatus()
  }, [user, authLoading, isLoggedIn])

  return (
    <AuthGate
      loading={authLoading || (isLoggedIn && gameState === 'loading')}
      loggedIn={isLoggedIn}
      onSignIn={signIn}
      loadingText="VERIFYING_IDENTITY..."
      title="RESEARCH ENROLLMENT"
      message="Please sign in to join a team."
    >
      <div className="min-h-screen font-mono p-4 md:p-8">
        {/* 頂部操作列 */}
        {isLoggedIn && (
          <div className="max-w-6xl mx-auto flex justify-end mb-4">
            <button
              onClick={() => signOut()}
              className="text-[10px] text-ink-muted hover:text-ink transition-colors border border-line px-2 py-1 uppercase tracking-widest"
            >
              Sign Out
            </button>
          </div>
        )}

        <main className="flex h-[70vh] items-center justify-center">
          {gameState === 'loading' ? (
            <div className="font-mono text-ink/50 uppercase italic">
              Synchronizing_Session...
            </div>
          ) : (
            <JoinTeamForm code={code} />
          )}
        </main>
      </div>
    </AuthGate>
  )
}