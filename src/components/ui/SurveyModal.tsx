import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import CommentLabel from '@/components/ui/CommentLabel'

const AGE_GROUPS = ['15 歲以下', '15–17 歲', '18–20 歲', '21–23 歲', '24 歲以上'] as const
const REFERRAL_SOURCES = ['社群媒體', '朋友介紹', '社團公告', '學校課程', '其他'] as const

interface Props {
  open: boolean
  onClose(): void
  /** 登入使用者的 id；不傳則以匿名方式提交 */
  userId?: string | null
  /** 送出或略過後的回調（可用於導頁等後續動作） */
  onComplete?(): void
}

export default function SurveyModal({ open, onClose, userId, onComplete }: Props) {
  const [ageGroup, setAgeGroup] = useState('')
  const [referralSource, setReferralSource] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  if (!open) return null

  const handleSubmit = async () => {
    setSubmitting(true)
    await supabase.from('surveys').insert({
      age_group: ageGroup || null,
      referral_source: referralSource || null,
      user_id: userId ?? null,
    })
    setSubmitting(false)
    setDone(true)
    setTimeout(() => { onComplete?.(); onClose() }, 800)
  }

  const handleSkip = () => { onComplete?.(); onClose() }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleSkip}
    >
      <div
        className="w-full max-w-sm border border-line bg-bg-elevated font-mono p-6 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="space-y-1">
          <CommentLabel text="quick_survey" />
          <p className="text-base text-ink">快速問卷</p>
          <p className="text-sm text-ink-muted">幫助我們了解社群組成，完全匿名。</p>
        </div>

        {done ? (
          <p className="text-sm text-success py-4 text-center">感謝你的回覆 ✓</p>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-xs text-ink-muted uppercase tracking-widest">年齡區間</p>
              <select
                value={ageGroup}
                onChange={e => setAgeGroup(e.target.value)}
                className="w-full bg-bg border border-line focus:border-line-active transition-colors px-3 py-2 text-sm text-ink outline-none appearance-none"
              >
                <option value="">（選填）</option>
                {AGE_GROUPS.map(ag => <option key={ag} value={ag}>{ag}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-ink-muted uppercase tracking-widest">你從哪裡知道 Latent？</p>
              <select
                value={referralSource}
                onChange={e => setReferralSource(e.target.value)}
                className="w-full bg-bg border border-line focus:border-line-active transition-colors px-3 py-2 text-sm text-ink outline-none appearance-none"
              >
                <option value="">（選填）</option>
                {REFERRAL_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={cn(
                  'flex-1 px-4 py-2.5 border text-sm transition-colors',
                  'border-primary-500 text-ink hover:bg-primary-950',
                  submitting && 'opacity-60 cursor-not-allowed',
                )}
              >
                {submitting ? '送出中…' : '送出'}
              </button>
              <button
                onClick={handleSkip}
                className="px-4 py-2.5 border border-line text-ink-muted hover:text-ink transition-colors text-sm"
              >
                略過
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
