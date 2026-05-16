import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { savePendingAction, consumePendingAction } from '@/lib/pending-action'
import { cn } from '@/lib/utils'

interface Props {
  projectId: string
  initialCount: number
}

export default function LikeButton({ projectId, initialCount }: Props) {
  const { user, isLoggedIn, isOnboarded, loading, signIn } = useSupabaseAuth()
  const [liked, setLiked] = useState(false)
  const [count, setCount] = useState(initialCount)
  const [pending, setPending] = useState(false)
  const [ready, setReady] = useState(false)

  // Fetch current like status when auth is resolved.
  useEffect(() => {
    if (loading) return
    if (!isLoggedIn || !user) { setReady(true); return }
    supabase
      .from('project_likes')
      .select('user_id')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => { setLiked(!!data); setReady(true) })
  }, [loading, isLoggedIn, user, projectId])

  const executeVote = useCallback(async () => {
    if (!user) return
    setPending(true)
    try {
      if (liked) {
        const { error } = await supabase
          .from('project_likes')
          .delete()
          .eq('project_id', projectId)
          .eq('user_id', user.id)
        if (!error) { setLiked(false); setCount(c => Math.max(0, c - 1)) }
      } else {
        const { error } = await supabase
          .from('project_likes')
          .insert({ project_id: projectId, user_id: user.id })
        if (!error) {
          setLiked(true)
          setCount(c => c + 1)
          if (!isOnboarded) {
            ;(window as any).notify?.(
              '建立創作者檔案，上傳你的作品！',
              'success',
              { href: '/profile', newTab: true },
            )
          }
        }
      }
    } finally {
      setPending(false)
    }
  }, [user, liked, projectId, isOnboarded])

  // After sign-in completes (isLoggedIn flips to true and like status is ready),
  // check for a pending VOTE action saved before auth started and replay it.
  useEffect(() => {
    if (!isLoggedIn || loading || !ready) return
    const action = consumePendingAction()
    if (action?.type === 'VOTE' && action.payload?.projectId === projectId) {
      executeVote()
    }
  }, [isLoggedIn, loading, ready, projectId, executeVote])

  const toggle = () => {
    if (!ready || pending) return

    if (!isLoggedIn) {
      // Save intent so it can be replayed automatically after auth.
      savePendingAction('VOTE', { projectId })
      signIn()
      return
    }

    executeVote()
  }

  return (
    <button
      onClick={toggle}
      disabled={pending || !ready}
      aria-pressed={liked}
      aria-label={liked ? '取消投票' : '為此專案投票'}
      className={cn(
        'cursor-pointer group flex items-center gap-3 px-6 pr-5 py-3.5 border font-mono transition-all duration-200',
        liked
          ? 'border-accent-500 bg-accent-950/60 text-accent-400 shadow-[0_0_20px_rgba(227,124,70,0.15)]'
          : 'border-line text-ink-muted hover:border-accent-500/70 hover:bg-accent-950/30 ',
        (pending || !ready) && 'opacity-60 cursor-wait',
      )}
    >
      <span
        className={cn(
          'text-2xl transition-transform duration-200 leading-none',
          liked ? 'scale-125' : 'group-hover:scale-110',
        )}
        aria-hidden="true"
      >
        ♦
      </span>
      <div className="flex flex-col items-start leading-tight w-13" suppressHydrationWarning>
        <span className="text-2xl font-black tabular-nums leading-none">{count}</span>
        <span className="text-xs uppercase tracking-widest opacity-70">
          {liked ? 'VOTED' : 'VOTE IT'}
        </span>
      </div>
    </button>
  )
}
