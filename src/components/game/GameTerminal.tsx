import { useEffect, useRef, useState } from 'react'
import { gameSupabase } from '@/lib/supabase-game'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import type { Tables } from '@/lib/database.types'

const TOTAL_PUZZLES = 11

type TeamInfo = Tables<'game_teams'>
type ProgressRow = Tables<'game_team_progress'>

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
  const [endingContent, setEndingContent] = useState<string | null>(null)

  const isFinished = progress.length >= TOTAL_PUZZLES

  // Load progress from Supabase client (RLS: user can read own team's progress)
  async function loadProgress() {
    const { data } = await gameSupabase
      .from('game_team_progress')
      .select('*')
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
    if (!activatedAt || isFinished) return
    const tick = () => {
      setElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - new Date(activatedAt).getTime()) / 1000))
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [activatedAt, isFinished])

  // 當遊戲完成時，自動抓取結局內容
  useEffect(() => {
    if (isFinished && accessToken && !endingContent) {
      fetch('/api/game/get-ending', {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.content) setEndingContent(data.content)
        })
        .catch(err => console.error('Failed to load ending:', err))
    }
  }, [isFinished, accessToken])

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

  // 判斷是否解開 Bonus (ID 11)，用來決定 UI 顯示的總題數
  const hasSolvedBonus = solvedMap.has(11)
  const displayTotal = hasSolvedBonus ? 11 : 10

  // 計算顯示時間：若已完成，則抓取最後一題的解題時間來計算總耗時
  const displayTime = (isFinished && activatedAt && progress.length > 0)
    ? formatRelative(
      new Date(Math.max(...progress.map(p => new Date(p.solved_at!).getTime()))).toISOString(),
      activatedAt
    )
    : activatedAt
      ? formatElapsed(elapsedSeconds)
      : '--:--'

  return (
    <div className=" bg-bg-surface font-mono text-sm flex flex-col items-center justify-start ">
      <div className="w-full border border-line">

        {/* Header */}
        <div className="border-b border-line px-4 py-2 space-y-3">
          <div className="text-lg text-accent-400 uppercase tracking-widest">
            LATENT 2026 實境解謎
          </div>
          <div className=' flex justify-between items-end'>
            <span>
              <span className="text-ink text-base">{team.team_name}</span>
              <span className="ml-2 text-ink-dim text-xs">
                #{team.team_code}
              </span>
            </span>
            <span className="text-xs text-ink uppercase ">
              {isFinished ? (
                <span className="text-success">
                  ALL_DONE IN {displayTime}
                </span>
              ) : (
                <>{progress.length} / {displayTotal} solved {displayTime}</>
              )}
            </span>
          </div>
        </div>

        {/* Puzzle grid */}
        <div className="px-4 py-4 space-y-1 border-b border-line">
          <div className="text-sm text-ink uppercase tracking-widest mb-3">
            PUZZLE STATUS
          </div>

          {Array.from({ length: TOTAL_PUZZLES }, (_, i) => {
            const id = i + 1
            const solvedAt = solvedMap.get(id)
            const isSolved = !!solvedAt

            // 隱藏加分題邏輯：若 ID 為 11 且尚未解開，則不顯示在清單中
            if (id === 11 && !isSolved) return null

            return (
              <div key={id} className="flex items-center gap-3 text-sm">
                <span className="text-ink-muted w-4 text-right">#{String(id).padStart(2, '0')}</span>
                {isSolved ? (
                  id === 11 ? (
                    <>
                      <span className="text-accent-400 animate-pulse">✦</span>
                      <span className="text-accent-400 tracking-tighter uppercase">Bonus [ACCESS GRANTED]</span>
                      {activatedAt && solvedAt && (
                        <span className="text-ink-muted ml-auto tabular-nums">
                          {formatRelative(solvedAt, activatedAt)}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-success">v</span>
                      <span className="text-success">SOLVED</span>
                      {activatedAt && solvedAt && (
                        <span className="text-ink-muted ml-auto tabular-nums">
                          {formatRelative(solvedAt, activatedAt)}
                        </span>
                      )}
                    </>
                  )
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

        {/* Ending Content Card - 只有在解開 11 題後顯示 */}
        {isFinished && endingContent && (
          <div className="px-4 py-6 bg-accent-400/5 border-b border-accent-400/30 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-accent-400 text-lg">✦</span>
              <div className="text-accent-400 font-bold tracking-[0.2em] uppercase text-xs">
                Decrypted_Message
              </div>
            </div>
            <div className="text-ink leading-relaxed whitespace-pre-wrap font-sans text-base pl-6 border-l border-accent-400/20">
              {endingContent}
            </div>
            <div className="mt-4 text-[10px] text-accent-400/50 text-right italic font-mono">End of Transmission _</div>
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-accent-400 text-base">{'>'}</span>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Awaiting input_"
              disabled={isSubmitting}
              className="flex-1 bg-transparent text-ink text-base focus:outline-none placeholder:text-ink-muted disabled:opacity-50"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !inputValue.trim()}
              className="text-xs uppercase tracking-widest border border-line px-2 py-1 text-ink-muted hover:border-accent-500 hover:text-accent-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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

    </div >
  )
}

function ResultLine({ result }: { result: LastResult }) {
  switch (result.status) {
    case 'correct':
      return (
        <div className="text-sm space-y-0.5">
          <div className="text-success">
            v CORRECT #{String(result.puzzle_id).padStart(2, '0')}
          </div>
          {result.message && (
            <div className="text-ink-muted  mt-2 px-3 py-1 bg-bg-overlay">{result.message}</div>
          )}
        </div>
      )
    case 'already_solved':
      return (
        <div className="text-sm space-y-0.5">

          <div className=" text-warning">
            ✦ #{String(result.puzzle_id).padStart(2, '0')} ALREADY SOLVED
          </div>
          {result.message && (
            <div className="text-ink-muted  mt-2 px-3 py-1 bg-bg-overlay">{result.message}</div>
          )}
        </div>
      )
    case 'incorrect':
      return <div className="text-sm text-danger">x INCORRECT</div>
    case 'rate_limited':
      return <div className="text-sm text-danger">◭ Too many attempts, please wait one minute.</div>
    case 'error':
      return <div className="text-sm text-danger">◭ An error has occurred. Please try again later.</div>
  }
}
