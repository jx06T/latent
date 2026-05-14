import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
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
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

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

  const toggle = async () => {
    if (!ready || pending) return

    if (!isLoggedIn) {
      setShowLoginPrompt(true)
      return
    }

    setPending(true)
    try {
      if (liked) {
        const { error } = await supabase
          .from('project_likes')
          .delete()
          .eq('project_id', projectId)
          .eq('user_id', user!.id)
        if (!error) { setLiked(false); setCount(c => Math.max(0, c - 1)) }
      } else {
        const { error } = await supabase
          .from('project_likes')
          .insert({ project_id: projectId, user_id: user!.id })
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
  }

  return (
    <div suppressHydrationWarning>
      {/* Like button */}
      <button
        onClick={toggle}
        disabled={pending || !ready}
        aria-pressed={liked}
        aria-label={liked ? '取消投票' : '為此專案投票'}
        className={cn(
          'group flex items-center gap-3 px-6 py-3.5 border font-mono transition-all duration-200',
          liked
            ? 'border-accent-500 bg-accent-950/60 text-accent-400 shadow-[0_0_20px_rgba(227,124,70,0.15)]'
            : 'border-line text-ink-muted hover:border-accent-500/70 hover:bg-accent-950/30 hover:text-accent-400',
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
        <div className="flex flex-col items-start leading-tight" suppressHydrationWarning>
          <span className="text-2xl font-black tabular-nums leading-none">{count}</span>
          <span className="text-xs uppercase tracking-widest opacity-70">
            {liked ? 'VOTED' : 'VOTE'}
          </span>
        </div>
      </button>

      {/* Login prompt overlay */}
      {showLoginPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowLoginPrompt(false)}
        >
          <div
            className="w-full max-w-sm border border-line bg-bg-elevated font-mono p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="space-y-1">
              <p className="text-sm uppercase tracking-widest text-ink-muted">投票</p>
              <p className="text-base text-ink">登入後即可為這個專案投票</p>
              <p className="text-sm text-ink-muted">
                只需要 Google 帳號，不需要填寫任何資料。
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowLoginPrompt(false)
                  signIn(typeof window !== 'undefined' ? window.location.pathname : '/')
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-line hover:border-accent-500 hover:text-accent-400 transition-colors text-sm"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google 登入
              </button>
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="px-4 py-2.5 border border-line text-ink-muted hover:text-ink transition-colors text-sm"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
