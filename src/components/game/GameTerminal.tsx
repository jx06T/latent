import { useEffect, useRef, useState } from 'react'
import { gameSupabase } from '@/lib/supabase-game'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'

const TOTAL_PUZZLES = 10

interface TeamInfo {
  id: string
  team_code: string
  group_name: string | null
  activated_at: string | null
}

interface ProgressRow {
  puzzle_id: number
  solved_at: string
}

type SubmitStatus = 'correct' | 'incorrect' | 'already_solved' | 'rate_limited' | 'error'

interface LastResult {
  status: SubmitStatus
  puzzle_id?: number
  message?: string | null
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function formatRelative(solvedAt: string, activatedAt: string): string {
  const diff = Math.max(0, Math.floor(
    (new Date(solvedAt).getTime() - new Date(activatedAt).getTime()) / 1000
  ))
  return formatElapsed(diff)
}

interface Props { team: TeamInfo }

export default function GameTerminal({ team }: Props) {
  const { accessToken } = useSupabaseAuth()
  const [progress, setProgress] = useState<ProgressRow[]>([])
  const [activatedAt, setActivatedAt] = useState<string | null>(team.activated_at)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [inputValue, setInputValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastResult, setLastResult] = useState<LastResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load progress from Supabase client (RLS: user can read own team's progress)
  async function loadProgress() {
    const { data } = await gameSupabase
      .from('game_team_progress')
      .select('puzzle_id, solved_at')
      .eq('team_id', team.id)
    setProgress(data ?? [])
  }

  // Load activated_at (in case team was just activated by this join)
  async function loadTeam() {
    const { data } = await gameSupabase
      .from('game_teams')
      .select('activated_at')
      .eq('id', team.id)
      .maybeSingle()
    if (data?.activated_at) setActivatedAt(data.activated_at)
  }

  useEffect(() => {
    loadProgress()
    if (!activatedAt) loadTeam()
  }, [team.id])

  // Elapsed timer
  useEffect(() => {
    if (!activatedAt) return
    const tick = () => {
      setElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - new Date(activatedAt).getTime()) / 1000))
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [activatedAt])

  async function handleSubmit() {
    const trimmed = inputValue.trim()
    if (!trimmed || isSubmitting || !accessToken) return

    setIsSubmitting(true)
    setLastResult(null)

    try {
      const res = await fetch('/api/game/submit-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ input_text: trimmed }),
      })

      const data = await res.json()

      if (res.status === 429) {
        setLastResult({ status: 'rate_limited' })
        return
      }
      if (!res.ok) {
        setLastResult({ status: 'error' })
        return
      }

      setLastResult({
        status: data.status,
        puzzle_id: data.puzzle_id,
        message: data.message,
      })

      if (data.status === 'correct') {
        setInputValue('')
        await loadProgress()
      }
    } catch {
      setLastResult({ status: 'error' })
    } finally {
      setIsSubmitting(false)
      inputRef.current?.focus()
    }
  }

  const solvedMap = new Map(progress.map(p => [p.puzzle_id, p.solved_at]))

  return (
    <div className="min-h-screen bg-bg font-mono text-sm flex flex-col items-center justify-start p-4 pt-8">
      <div className="w-full max-w-lg border border-line">

        {/* Header */}
        <div className="border-b border-line px-4 py-2 space-y-0.5">
          <div className="text-xs text-accent-400 uppercase tracking-widest">
            LATENT 2026 // RESEARCH TERMINAL
          </div>
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>
              <span className="text-ink">{team.team_code}</span>
              {team.group_name && (
                <span className="ml-2 px-1.5 py-0.5 border border-line text-ink-muted text-[10px]">
                  {team.group_name}
                </span>
              )}
            </span>
            <span className="tabular-nums">
              {activatedAt ? formatElapsed(elapsedSeconds) : '--:--'}
            </span>
          </div>
        </div>

        {/* Puzzle grid */}
        <div className="px-4 py-3 space-y-1 border-b border-line">
          <div className="text-[10px] text-ink-muted uppercase tracking-widest mb-2">
            PUZZLE STATUS
          </div>
          {Array.from({ length: TOTAL_PUZZLES }, (_, i) => {
            const id = i + 1
            const solvedAt = solvedMap.get(id)
            const isSolved = !!solvedAt

            return (
              <div key={id} className="flex items-center gap-3 text-xs">
                <span className="text-ink-muted w-4 text-right">#{String(id).padStart(2, '0')}</span>
                {isSolved ? (
                  <>
                    <span className="text-green-400">✓</span>
                    <span className="text-green-400">SOLVED</span>
                    {activatedAt && solvedAt && (
                      <span className="text-ink-muted ml-auto tabular-nums">
                        {formatRelative(solvedAt, activatedAt)}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-ink-muted">─</span>
                    <span className="text-ink-muted">UNSOLVED</span>
                  </>
                )}
              </div>
            )
          })}
        </div>

        {/* Input */}
        <div className="px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-accent-400 text-xs">{'>'}</span>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="輸入答案..."
              disabled={isSubmitting}
              className="flex-1 bg-transparent text-ink text-xs focus:outline-none placeholder:text-ink-muted disabled:opacity-50"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !inputValue.trim()}
              className="text-[10px] uppercase tracking-widest border border-line px-2 py-1 text-ink-muted hover:border-accent-500 hover:text-accent-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '...' : 'SUBMIT'}
            </button>
          </div>

          {/* Last result feedback */}
          {lastResult && (
            <ResultLine result={lastResult} />
          )}
        </div>

      </div>

      {/* Solved count footer */}
      <div className="mt-3 text-[10px] text-ink-muted tabular-nums">
        {progress.length} / {TOTAL_PUZZLES} solved
      </div>
    </div>
  )
}

function ResultLine({ result }: { result: LastResult }) {
  switch (result.status) {
    case 'correct':
      return (
        <div className="text-xs space-y-0.5">
          <div className="text-green-400">
            ✓ CORRECT — #{String(result.puzzle_id).padStart(2, '0')} 解開
          </div>
          {result.message && (
            <div className="text-ink-muted border-l border-green-900 pl-2">{result.message}</div>
          )}
        </div>
      )
    case 'already_solved':
      return (
        <div className="text-xs text-yellow-500">
          ● #{String(result.puzzle_id).padStart(2, '0')} 已解開過了
        </div>
      )
    case 'incorrect':
      return <div className="text-xs text-red-400">✗ INCORRECT</div>
    case 'rate_limited':
      return <div className="text-xs text-red-400">⚠ 太多錯誤嘗試，請稍等一分鐘</div>
    case 'error':
      return <div className="text-xs text-red-400">⚠ 發生錯誤，請稍後再試</div>
  }
}
