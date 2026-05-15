import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { getAvatarUrl } from '@/lib/avatar'
import SurveyModal from '@/components/ui/SurveyModal'
import AuthGate from '@/components/ui/AuthGate'

// ── Types ──────────────────────────────────────────────────────────────────

type HandleStatus = 'idle' | 'too_short' | 'invalid_format' | 'checking' | 'available' | 'taken'

interface DraftState {
  handle: string
  nickname: string
  affiliation: string
  ageGroup: string
  avatar_seed?: string
}

const DRAFT_KEY = 'latent:onboarding:draft'

const AFFILIATIONS = ['建電', '北資', '其他'] as const
const AGE_GROUPS = ['國中以下', '國中生', '高中生', '大學生', '社會人士'] as const

// ── Helpers ────────────────────────────────────────────────────────────────

function isValidHandleFormat(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(value) && value.length >= 3 && value.length <= 30
}

function getHandleStatus(value: string): HandleStatus | null {
  if (!value) return 'idle'
  if (value.length < 3) return 'too_short'
  if (!isValidHandleFormat(value)) return 'invalid_format'
  return null
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function OnboardingForm() {
  const { user, isOnboarded, loading: authLoading, signIn, signOut } = useSupabaseAuth()

  const [handle, setHandle] = useState('')
  const [nickname, setNickname] = useState('')
  const [affiliation, setAffiliation] = useState('')
  const [ageGroup, setAgeGroup] = useState('')

  const [avatarSeed, setAvatarSeed] = useState('')
  const avatarCustomized = useRef(false)

  const [handleStatus, setHandleStatus] = useState<HandleStatus>('idle')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showSurvey, setShowSurvey] = useState(false)
  const pendingDestRef = useRef<string>('/profile')

  // Redirect already-onboarded users away from this page
  useEffect(() => {
    if (!authLoading && isOnboarded) {
      window.location.replace('/profile')
    }
  }, [authLoading, isOnboarded])

  // Restore draft from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const draft: DraftState = JSON.parse(raw)
      if (draft.handle) setHandle(draft.handle)
      if (draft.nickname) setNickname(draft.nickname)
      if (draft.affiliation) setAffiliation(draft.affiliation)
      if (draft.ageGroup) setAgeGroup(draft.ageGroup)
      if (draft.avatar_seed) { setAvatarSeed(draft.avatar_seed); avatarCustomized.current = true }
    } catch {
      // ignore
    }
  }, [])

  // Follow handle as avatar seed until user manually customizes
  useEffect(() => {
    if (!avatarCustomized.current) setAvatarSeed(handle || '')
  }, [handle])

  const randomizeAvatar = useCallback(() => {
    const suffix = Math.random().toString(36).slice(2, 6)
    setAvatarSeed(handle ? `${handle}-${suffix}` : suffix)
    avatarCustomized.current = true
  }, [handle])

  // Persist draft to localStorage
  useEffect(() => {
    const draft: DraftState = { handle, nickname, affiliation, ageGroup, avatar_seed: avatarSeed }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [handle, nickname, affiliation, ageGroup, avatarSeed])

  // Handle availability check (debounced)
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const checkHandleAvailability = useCallback(async (value: string) => {
    setHandleStatus('checking')
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('handle', value)
      .maybeSingle()
    setHandleStatus(data ? 'taken' : 'available')
  }, [])

  useEffect(() => {
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current)
    const syncStatus = getHandleStatus(handle)
    if (syncStatus !== null) { setHandleStatus(syncStatus); return }
    checkTimerRef.current = setTimeout(() => checkHandleAvailability(handle), 450)
    return () => { if (checkTimerRef.current) clearTimeout(checkTimerRef.current) }
  }, [handle, checkHandleAvailability])

  // ── Submit ────────────────────────────────────────────────────────────────

  const canSubmit =
    handleStatus === 'available' &&
    nickname.trim().length >= 1 &&
    affiliation !== '' &&
    !isSubmitting

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!canSubmit || !user) return
    setIsSubmitting(true)
    setSubmitError(null)

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      handle: handle.trim(),
      nickname: nickname.trim(),
      bio: '',
      tags: [affiliation, ageGroup].filter(Boolean) as string[] || null,
      avatar_url: avatarSeed || handle.trim() || null,
      is_onboarded: true,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.error('Upsert Error:', error)
      setSubmitError(error.message.includes('profiles_handle_key')
        ? '此代稱已被使用，請換一個。'
        : `發生錯誤：${error.message}`)
      setIsSubmitting(false)
      return
    }

    localStorage.removeItem(DRAFT_KEY)

    const params = new URLSearchParams(window.location.search)
    pendingDestRef.current = params.get('next') || '/profile'
    setShowSurvey(true)
  }

  const handleSurveyDone = () => {
    window.location.replace(pendingDestRef.current)
  }

  // ── Handle status UI ──────────────────────────────────────────────────────

  const handleStatusEl = (() => {
    const base = 'text-sm mt-1 font-mono'
    switch (handleStatus) {
      case 'idle': return null
      case 'too_short': return <p className={cn(base, 'text-ink-disabled')}>至少需要 3 個字元</p>
      case 'invalid_format': return <p className={cn(base, 'text-ink-disabled')}>僅限小寫英數字母及連字號 (-)，不可在兩端</p>
      case 'checking': return <p className={cn(base, 'text-ink-dim animate-pulse')}>確認中…</p>
      case 'available': return <p className={cn(base, 'text-success')}>✓ 可以使用</p>
      case 'taken': return <p className={cn(base, 'text-danger')}>✗ 此代稱已被使用</p>
    }
  })()

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AuthGate
      loading={authLoading}
      loggedIn={!!user}
      onSignIn={() => signIn()}
      loadingText="確認身份中…"
      title="LATENT · 初次設定"
      message="請先登入以建立你的身份"
    >
    <div className="min-h-screen bg-bg font-mono text-ink flex flex-col items-center justify-center px-4 py-12 pt-24">
      <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm uppercase tracking-widest text-ink-dim">LATENT · 初次設定</p>
            <h1 className="text-xl text-ink">建立你的身份</h1>
            <p className="text-sm text-ink-muted">這些資訊將幫助社群認識你。</p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="shrink-0 text-xs text-ink-disabled hover:text-ink-muted transition-colors border border-transparent hover:border-line px-2 py-1"
          >
            登出
          </button>
        </div>

        {/* Handle + Avatar */}
        <div className="flex gap-6 items-start">
          <div className="flex-1 space-y-2">
            <label className="block text-sm text-ink-muted uppercase tracking-widest">
              唯一代稱 <span className="text-danger text-sm">*</span>
            </label>
            <div className="flex items-center border border-line focus-within:border-line-active transition-colors">
              <span className="px-3 text-ink-disabled text-sm select-none">@</span>
              <input
                type="text"
                value={handle}
                onChange={e => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="your-handle"
                maxLength={30}
                autoComplete="off"
                spellCheck={false}
                className="flex-1 bg-transparent py-2 pr-3 text-sm text-ink placeholder:text-ink-disabled outline-none"
              />
            </div>
            {handleStatusEl}
            <p className="text-sm text-ink-ddim">設定後無法修改 · 你的公開頁面將是 /@{handle || 'handle'}</p>
          </div>

          <div className="shrink-0 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={randomizeAvatar}
              title="點擊更換頭像"
              className="relative group w-18 h-18 border border-line bg-bg-elevated focus:outline-none focus:border-line-active"
            >
              <img
                src={getAvatarUrl(avatarSeed || user?.id || '')}
                alt="Avatar preview"
                width={72}
                height={72}
                className="w-full h-full"
              />
            </button>
            <p className="text-[11px] text-ink-ddim text-center">頭像預覽<br />點擊更換</p>
          </div>
        </div>

        {/* Nickname */}
        <div className="space-y-2">
          <label className="block text-sm text-ink-muted uppercase tracking-widest">
            個人綽號 <span className="text-danger text-sm">*</span>
          </label>
          <input
            type="text"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="顯示在頁面上的名稱，可含中文"
            maxLength={50}
            className="w-full bg-transparent border border-line focus:border-line-active transition-colors px-3 py-2 text-sm text-ink placeholder:text-ink-disabled outline-none"
          />
        </div>

        {/* Affiliation */}
        <div className="space-y-2">
          <label className="block text-sm text-ink-muted uppercase tracking-widest">
            所屬社團 <span className="text-danger text-sm">*</span>
          </label>
          <div className="flex gap-3">
            {AFFILIATIONS.map(aff => (
              <button
                key={aff}
                type="button"
                onClick={() => setAffiliation(aff)}
                className={cn(
                  'px-4 py-2 border text-sm transition-colors',
                  affiliation === aff
                    ? 'border-accent-500 text-ink bg-bg-elevated'
                    : 'border-line text-ink-muted hover:border-line-active hover:text-ink'
                )}
              >
                {aff}
              </button>
            ))}
          </div>
        </div>

        {/* Age Group */}
        <div className="space-y-2">
          <label className="block text-sm text-ink-muted uppercase tracking-widest">
            年級身份 <span className="text-ink-disabled text-xs normal-case">（選填）</span>
          </label>
          <div className="flex flex-wrap gap-3">
            {AGE_GROUPS.map(ag => (
              <button
                key={ag}
                type="button"
                onClick={() => setAgeGroup(prev => prev === ag ? '' : ag)}
                className={cn(
                  'px-4 py-2 border text-sm transition-colors',
                  ageGroup === ag
                    ? 'border-accent-500 text-ink bg-bg-elevated'
                    : 'border-line text-ink-muted hover:border-line-active hover:text-ink'
                )}
              >
                {ag}
              </button>
            ))}
          </div>
        </div>

        {/* Submit error */}
        {submitError && (
          <p className="text-sm text-danger border border-danger/30 bg-danger-ghost px-3 py-2">
            {submitError}
          </p>
        )}

        {/* Submit */}
        <div className="flex items-center gap-4">
          <Button
            type="submit"
            variant="primary"
            disabled={!canSubmit}
            className="px-6 py-2 text-sm"
          >
            {isSubmitting ? '儲存中…' : '完成設定'}
          </Button>
          <p className="text-sm text-ink-disabled">* 為必填欄位</p>
        </div>
      </form>

      <SurveyModal
        open={showSurvey}
        onClose={() => handleSurveyDone()}
        userId={user?.id}
        onComplete={handleSurveyDone}
      />
    </div>
    </AuthGate>
  )
}
