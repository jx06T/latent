import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import CommentLabel from '@/components/ui/CommentLabel'

// ── Question definitions ───────────────────────────────────────────────────────

const SURVEY_QUESTIONS = [
  {
    id: 'age_group',
    label: '年齡區間',
    options: ['15 歲以下', '15–17 歲', '18–20 歲', '21–23 歲', '24 歲以上'],
  },
  {
    id: 'referral_source',
    label: '你從哪裡知道 Latent？',
    options: ['社群媒體', '朋友介紹', '社團公告', '學校課程', '其他'],
  },
  {
    id: 'gender',
    label: '性別',
    options: ['男', '女', '不願透漏'],
  },
  {
    id: 'exhibition_plan',
    label: '是否有計畫參與實體展覽？',
    options: ['是', '否 — 交通不便', '否 — 另有安排', '否 — 吸引力不夠'],
  },
] as const

type QuestionId = (typeof SURVEY_QUESTIONS)[number]['id']
type Answers = Partial<Record<QuestionId, string>>

// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose(): void
  /** 登入使用者的 id；不傳則以匿名方式提交 */
  userId?: string | null
  /** 送出或略過後的回調 */
  onComplete?(): void
}

const QUESTION_COUNT = SURVEY_QUESTIONS.length
// total steps = questions + confirm page
const TOTAL_STEPS = QUESTION_COUNT + 1

export default function SurveyModal({ open, onClose, userId, onComplete }: Props) {
  const [page, setPage] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  if (!open) return null

  const isConfirmPage = page === QUESTION_COUNT
  const currentQuestion = isConfirmPage ? null : SURVEY_QUESTIONS[page]
  const progress = Math.round(((page + 1) / TOTAL_STEPS) * 100)

  const handleSelect = (value: string) => {
    if (!currentQuestion) return
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }))
    setTimeout(() => setPage(p => p + 1), 200)
  }

  const handleSkipQuestion = () => setPage(p => p + 1)
  const handleBack = () => setPage(p => Math.max(0, p - 1))
  const handleSkipAll = () => { onComplete?.(); onClose() }

  const handleSubmit = async () => {
    setSubmitting(true)
    await supabase.from('surveys').insert({
      age_group: answers.age_group ?? null,
      referral_source: answers.referral_source ?? null,
      gender: answers.gender ?? null,
      exhibition_plan: answers.exhibition_plan ?? null,
      user_id: userId ?? null,
    })
    setSubmitting(false)
    setDone(true)
    setTimeout(() => { onComplete?.(); onClose() }, 800)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={handleSkipAll}
    >
      <div
        className="w-full max-w-sm border border-line bg-bg-elevated font-mono overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="h-0.5 bg-line">
          <div
            className="h-full bg-accent-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CommentLabel text="quick_survey" />
              <p className="text-base text-ink">快速問卷</p>
              <p className="text-xs text-ink-muted">幫助我們了解社群組成，完全匿名。</p>
            </div>
            {!done && (
              <span className="shrink-0 text-xs text-ink-ddim tabular-nums pt-0.5">
                {isConfirmPage ? `${QUESTION_COUNT}` : `${page + 1}`} / {QUESTION_COUNT}
              </span>
            )}
          </div>

          {done ? (
            <p className="text-sm text-success py-4 text-center">感謝你的回覆 ✓</p>
          ) : isConfirmPage ? (
            <div className="space-y-4">
              <p className="text-sm text-ink-muted">確認你的回答：</p>
              <div className="space-y-2 border border-line p-3">
                {SURVEY_QUESTIONS.map(q => (
                  <div key={q.id} className="flex justify-between gap-4 text-sm">
                    <span className="text-ink-ddim shrink-0">{q.label}</span>
                    <span className="text-ink text-right">{answers[q.id as QuestionId] ?? '—'}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleBack}
                  className="px-4 py-2.5 border border-line text-ink-muted hover:text-ink transition-colors text-sm"
                >
                  ← 修改
                </button>
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
              </div>
            </div>
          ) : currentQuestion ? (
            <div className="space-y-4">
              <p className="text-sm text-ink">{currentQuestion.label}</p>
              <div className="flex flex-col gap-2">
                {currentQuestion.options.map(opt => (
                  <button
                    key={opt}
                    onClick={() => handleSelect(opt)}
                    className={cn(
                      'w-full px-4 py-2.5 border text-sm text-left transition-colors',
                      answers[currentQuestion.id as QuestionId] === opt
                        ? 'border-primary-500 text-ink bg-primary-950'
                        : 'border-line text-ink-muted hover:border-line-active hover:text-ink',
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <div className="flex justify-between items-center">
                {page > 0 ? (
                  <button
                    onClick={handleBack}
                    className="text-xs text-ink-ddim hover:text-ink-muted transition-colors"
                  >
                    ← 上一題
                  </button>
                ) : <span />}
                <button
                  onClick={handleSkipQuestion}
                  className="text-xs text-ink-ddim hover:text-ink-muted transition-colors"
                >
                  下一題 →
                </button>
              </div>
            </div>
          ) : null}

          {!done && !isConfirmPage && (
            <button
              onClick={handleSkipAll}
              className="w-full text-xs text-ink-disabled hover:text-ink-muted transition-colors border-t border-line pt-4"
            >
              略過整份問卷
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
