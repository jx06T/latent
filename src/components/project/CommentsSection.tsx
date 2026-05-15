import { useState, useEffect } from 'react'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { cn } from '@/lib/utils'
import GoogleSignInButton from '@/components/ui/GoogleSignInButton'

interface CommentAuthor {
  handle: string
  nickname: string
  avatar_url: string | null
}

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  author: CommentAuthor | null
}

interface Props {
  projectId: string
}

import { getAvatarUrl } from '@/lib/avatar'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function CommentsSection({ projectId }: Props) {
  const { isLoggedIn, isOnboarded, accessToken, loading, signIn } = useSupabaseAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [fetchingComments, setFetchingComments] = useState(true)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/comments/${projectId}`)
      .then(r => r.json())
      .then(data => setComments(Array.isArray(data) ? data : []))
      .catch(() => setComments([]))
      .finally(() => setFetchingComments(false))
  }, [projectId])

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!content.trim() || !accessToken) return
    setSubmitting(true)
    setSubmitError(null)

    const res = await fetch(`/api/comments/${projectId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ content: content.trim() }),
    })

    if (res.ok) {
      const newComment: Comment = await res.json()
      setComments(prev => [...prev, newComment])
      setContent('')
      if (!isOnboarded) {
        ; (window as any).notify?.(
          '建立創作者檔案，讓你的留言顯示你的代稱！',
          'success',
          { href: '/profile', newTab: true },
        )
      }
    } else {
      const data = await res.json().catch(() => ({}))
      setSubmitError((data as any).error ?? '留言失敗，請稍後再試')
    }
    setSubmitting(false)
  }

  return (
    <section className="mt-16 font-mono" suppressHydrationWarning>
      <h2 className="text-lg uppercase tracking-widest text-ink-dim mb-6">// Comments</h2>

      {/* Comment list */}
      {fetchingComments ? (
        <div className="text-sm text-ink-muted animate-pulse py-4 h-26">載入留言…</div>
      ) : comments.length === 0 ? (
        <div className="border border-dashed border-line text-center py-10 text-sm text-ink-muted h-26">
          還沒有留言，成為第一個留言的人
        </div>
      ) : (
        <div className="divide-y divide-line border border-line mb-8">
          {comments.map(c => {
            const seed = c.author?.avatar_url ?? c.author?.handle ?? c.user_id
            const name = c.author?.nickname ?? '訪客'
            const handle = c.author?.handle ?? null
            return (
              <div key={c.id} className="flex gap-3 p-4">
                <img
                  src={getAvatarUrl(seed)}
                  alt={name}
                  width={32}
                  height={32}
                  className="w-8 h-8 border border-line bg-bg-elevated shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-1">
                    <span className="text-sm text-ink">{name}</span>
                    {handle && (
                      <a
                        href={`/@${handle}`}
                        className="text-xs text-ink-dim hover:text-ink transition-colors"
                      >
                        @{handle}
                      </a>
                    )}
                    <span className="text-xs text-ink-disabled ml-auto shrink-0">
                      {formatDate(c.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-ink-muted whitespace-pre-wrap wrap-break-word leading-relaxed">
                    {c.content}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Comment form */}
      {loading ? <div className=' w-full h-32'></div> : !isLoggedIn ? (
        <div className="border border-line p-5 text-center space-y-3 h-32">
          <p className="text-sm text-ink-muted">登入後才能留言</p>
          <GoogleSignInButton
            label="Google 登入"
            onClick={() => signIn()}
          />
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-2 h-32">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="留下你的想法…"
            maxLength={500}
            rows={3}
            className={cn(
              'w-full bg-bg-surface border border-line focus:border-line-active transition-colors',
              'px-3 py-2 text-sm text-ink placeholder:text-ink-disabled outline-none resize-none',
            )}
          />
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-disabled flex-1">{content.length}/500</span>
            {submitError && (
              <span className="text-xs text-danger">{submitError}</span>
            )}
            <button
              type="submit"
              disabled={!content.trim() || submitting}
              className={cn(
                'px-4 py-1.5 border text-sm transition-colors',
                content.trim() && !submitting
                  ? 'border-accent-500 text-accent-400 hover:bg-accent-950/40'
                  : 'border-line text-ink-disabled cursor-not-allowed',
              )}
            >
              {submitting ? '送出中…' : '留言'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
