import React, { useState, useEffect, useCallback } from 'react'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { supabase } from '@/lib/supabase'
import { publishedUrl, draftKey, toCdnUrl } from '@/lib/image-paths'
import { Button, LinkButton } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { cn } from '@/lib/utils'
import EditorTopBar from '@/components/editor/EditorTopBar'
import NewProjectModal from '@/components/editor/NewProjectModal'
import ProjectListItem, { type ProjectSummary } from '@/components/editor/ProjectListItem'
import AuthGate from '@/components/ui/AuthGate'
import SurveyModal from '@/components/ui/SurveyModal'
import { SURVEY_DONE_KEY } from '@/lib/survey-questions'
import { getAvatarUrl } from '@/lib/avatar'
import Link from '../ui/Link'

const AFFILIATIONS = ['建電', '北資', '其他'] as const
const AGE_GROUPS = ['國中以下', '國中生', '高中生', '大學生', '社會人士'] as const


export default function ProfileDashboard() {

  const { user, profile, isLoggedIn, isOnboarded, accessToken, loading: authLoading, signIn, signOut, refreshProfile } = useSupabaseAuth()

  // ── Tab ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'projects' | 'profile'>('projects')
  const [pendingTab, setPendingTab] = useState<'projects' | 'profile' | null>(null)

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash === 'profile') setActiveTab('profile')
  }, [])

  const switchTab = useCallback((tab: 'projects' | 'profile') => {
    setActiveTab(tab)
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${tab}`)
  }, [])

  // ── Projects ───────────────────────────────────────────────────────────
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [unpublishingId, setUnpublishingId] = useState<string | null>(null)
  const [coverImageUrls, setCoverImageUrls] = useState<Record<string, string>>({})

  // ── Profile editing ────────────────────────────────────────────────────
  const [draftNickname, setDraftNickname] = useState('')
  const [draftBio, setDraftBio] = useState('')
  const [draftAffiliation, setDraftAffiliation] = useState('')
  const [draftAgeGroup, setDraftAgeGroup] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null)
  const [profileSaved, setProfileSaved] = useState(false)

  const [showSurvey, setShowSurvey] = useState(false)
  const [surveyDone, setSurveyDone] = useState(true) // start hidden to avoid flicker

  useEffect(() => {
    setSurveyDone(localStorage.getItem(SURVEY_DONE_KEY) === '1')
  }, [])

  const { confirm, dialog } = useConfirm()

  // Sync draft fields when profile loads
  useEffect(() => {
    if (profile) {
      setDraftNickname(profile.nickname)
      setDraftBio(profile.bio ?? '')
      const tags = profile.tags ?? []
      setDraftAffiliation(tags.find(t => (AFFILIATIONS as readonly string[]).includes(t)) ?? '')
      setDraftAgeGroup(tags.find(t => (AGE_GROUPS as readonly string[]).includes(t)) ?? '')
    }
  }, [profile])

  // Auto-open new project modal when redirected from onboarding with ?new=1
  useEffect(() => {
    if (!authLoading && isLoggedIn && isOnboarded) {
      const params = new URLSearchParams(window.location.search)
      if (params.get('new') === '1') {
        setShowNewModal(true)
        window.history.replaceState(null, '', window.location.pathname)
      }
    }
  }, [authLoading, isLoggedIn, isOnboarded])

  // Redirect to onboarding if logged in but not yet onboarded.
  // authLoading=false guarantees profile fetch is complete (null = no profile row = new user).
  useEffect(() => {
    if (!authLoading && isLoggedIn && !isOnboarded) {
      window.location.replace('/onboarding')
    }
  }, [authLoading, isLoggedIn, isOnboarded])

  // ── Load projects ──────────────────────────────────────────────────────
  const loadProjects = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, slug, status, year, updated_at, created_at, cover_image_id, project_images!project_images_project_id_fkey(id, project_id,status, source_ext, published_ext, available_sizes)')
        .eq('author_id', user.id)
        .order('updated_at', { ascending: false })
      if (error) throw error

      const enrichedProjects = (data ?? []).map((p: any): ProjectSummary => {
        const coverImg = p.cover_image_id && p.project_images
          ? p.project_images.find((img: any) => img.id === p.cover_image_id)
          : undefined

        return {
          id: p.id,
          title: p.title,
          slug: p.slug,
          status: p.status,
          year: p.year,
          updated_at: p.updated_at,
          created_at: p.created_at,
          cover_image_id: p.cover_image_id,
          cover_image: coverImg,
        }
      })

      setProjects(enrichedProjects)
    } catch (err) {
      console.error('Failed to load projects:', err)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!authLoading && isLoggedIn && isOnboarded) loadProjects()
    else if (!authLoading) setIsLoading(false)
  }, [authLoading, isLoggedIn, isOnboarded, loadProjects])

  // ── Generate cover image preview URLs ───────────────────────────────────
  useEffect(() => {
    if (!projects.length) return

    const urls: Record<string, string> = {}

    for (const p of projects) {
      if (!p.cover_image) continue

      try {
        if (p.cover_image.status === 'published' && p.cover_image.published_ext && p.cover_image.available_sizes?.length) {
          urls[p.cover_image_id!] = publishedUrl(p.cover_image, 'md')
        } else if (p.cover_image.status === 'draft' && p.cover_image.source_ext) {
          const key = draftKey(p.cover_image.project_id, p.cover_image.id, p.cover_image.source_ext)
          urls[p.cover_image_id!] = toCdnUrl(key)
        }
      } catch (err) {
        console.warn(`Failed to generate cover image URL for ${p.cover_image_id}:`, err)
      }
    }

    setCoverImageUrls(urls)
  }, [projects])

  // ── Delete project ─────────────────────────────────────────────────────
  const handleDelete = useCallback(async (id: string, title: string) => {
    if (!accessToken) return
    const ok = await confirm({
      title: '刪除專案',
      message: `確認刪除「${title || '(untitled)'}」？\n此操作將一併刪除所有圖片，且無法復原。`,
      confirmText: '刪除',
      variant: 'danger',
    })
    if (!ok) return
    setDeletingId(id)
    const res = await fetch(`/api/projects/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (res.ok) setProjects(prev => prev.filter(p => p.id !== id))
    setDeletingId(null)
  }, [accessToken, confirm])

  const handleUnpublish = useCallback(async (id: string, title: string) => {
    if (!accessToken) return
    const ok = await confirm({
      title: '取消發布',
      message: `確認取消發布「${title || '(untitled)'}」？\n專案將從公開列表移除，圖片不受影響。\n注意：URL slug 仍會保持鎖定。`,
      confirmText: '取消發布',
      variant: 'danger',
    })
    if (!ok) return
    setUnpublishingId(id)
    const res = await fetch('/api/unpublish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ project_id: id }),
    })
    if (res.ok) {
      setProjects(prev => prev.map(p => p.id === id ? { ...p, status: 'draft' } : p))
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data.message ?? data.error ?? '取消發布失敗')
    }
    setUnpublishingId(null)
  }, [accessToken, confirm])

  const handleProjectCreated = (projectId: string) => {
    window.location.href = `/editor/${projectId}`
  }

  const isDirty = profile
    ? draftNickname !== profile.nickname
    || draftBio !== (profile.bio ?? '')
    || draftAffiliation !== (profile.tags?.find(t => (AFFILIATIONS as readonly string[]).includes(t)) ?? '')
    || draftAgeGroup !== (profile.tags?.find(t => (AGE_GROUPS as readonly string[]).includes(t)) ?? '')
    : false

  const handleTabClick = (tab: 'projects' | 'profile') => {
    if (tab === activeTab) return
    if (activeTab === 'profile' && isDirty) {
      setPendingTab(tab)
      return
    }
    switchTab(tab)
  }

  const resetDrafts = () => {
    if (!profile) return
    setDraftNickname(profile.nickname)
    setDraftBio(profile.bio ?? '')
    const tags = profile.tags ?? []
    setDraftAffiliation(tags.find(t => (AFFILIATIONS as readonly string[]).includes(t)) ?? '')
    setDraftAgeGroup(tags.find(t => (AGE_GROUPS as readonly string[]).includes(t)) ?? '')
  }

  // ── Save profile ───────────────────────────────────────────────────────
  const saveProfile = async (): Promise<boolean> => {
    if (!user || !draftNickname.trim()) return false
    setProfileSaving(true)
    setProfileSaveError(null)

    const { error } = await supabase
      .from('profiles')
      .update({
        nickname: draftNickname.trim(),
        bio: draftBio.trim(),
        tags: [draftAffiliation, draftAgeGroup].filter(Boolean) as string[] || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    setProfileSaving(false)
    if (error) {
      setProfileSaveError(error.message)
      return false
    }
    await refreshProfile()
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 3000)
    return true
  }

  const handleSaveAndSwitch = async () => {
    const target = pendingTab
    const ok = await saveProfile()
    setPendingTab(null)
    if (ok && target) switchTab(target)
  }

  const handleDiscardAndSwitch = () => {
    const target = pendingTab
    resetDrafts()
    setPendingTab(null)
    if (target) switchTab(target)
  }

  const userHandle = profile?.handle ?? (
    user?.user_metadata?.full_name
      ? `${(user.user_metadata.full_name as string).toLowerCase().replace(/\s+/g, '_')}`
      : `${user?.email?.split('@')[0] ?? 'user'}`
  )

  // ── Dashboard ──────────────────────────────────────────────────────────
  return (
    <AuthGate
      loading={authLoading}
      loggedIn={isLoggedIn}
      loadingText="Checking session…"
      title="Latent · Profile"
      message="Sign in to manage your projects"
      onSignIn={signIn}
    >
      <div className="min-h-screen bg-bg font-mono">
        <EditorTopBar
          left={
            <>
              <LinkButton href="/" variant="ghost" className="text-sm  px-0">← Home</LinkButton>
              <span className="w-px h-4 bg-line hidden sm:block" />
              <a
                href={`/@${userHandle}`}
                className="text-sm text-ink-muted hover:text-ink transition-colors hidden sm:block"
              >
                @{userHandle}
              </a>
            </>
          }
          right={
            <>
              {activeTab === 'projects' && (
                <Button variant="primary" onClick={() => setShowNewModal(true)} className="text-sm px-3">
                  + New Project
                </Button>
              )}
              <Button variant="ghost" onClick={signOut} className="text-sm px-3 w-22">Sign Out</Button>
            </>
          }
        />

        <main className="max-w-4xl mx-auto px-4 py-8  pt-20">
          {/* Tabs */}
          <div className="flex border-b border-line mb-8">
            {(['projects', 'profile'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => handleTabClick(tab)}
                className={cn(
                  'px-4 py-2 text-xs font-mono uppercase tracking-widest transition-colors border-b-2 -mb-px',
                  activeTab === tab
                    ? 'border-accent-500 text-ink'
                    : 'border-transparent text-ink-muted hover:text-ink',
                )}
              >
                {tab === 'projects' ? '專案' : '個人資料'}
              </button>
            ))}
          </div>

          {/* ── Projects tab ─────────────────────────────────────────────── */}
          {activeTab === 'projects' && (
            <>
              <div className="flex items-end justify-between mb-6">
                <h1 className="text-sm uppercase tracking-widest text-ink">Projects</h1>
                <span className="text-sm text-ink-ddim">{projects.length} total</span>
              </div>

              <div className="mb-6 px-3 py-2.5 border border-line bg-bg-elevated text-xs text-ink-muted flex items-baseline gap-1.5 flex-wrap">
                <span>每人限暫存 3 個草稿, 每篇文章限 10 張圖, 發布文章即同意公開展示及相關條款。<Link href="/terms" className=' text-ink-ddim'>服務條款</Link></span>

              </div>

              {isLoading ? (
                <div className="text-center py-12 text-ink-muted text-sm animate-pulse">Loading…</div>
              ) : projects.length === 0 ? (
                <div className="border border-dashed border-line text-center py-12 space-y-3">
                  <p className="text-sm text-ink-muted">尚無專案</p>
                  <Button variant="outline" onClick={() => setShowNewModal(true)}>
                    建立第一個專案
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-line border border-line">
                  {projects.map(p => (
                    <ProjectListItem
                      key={p.id}
                      project={p}
                      coverUrl={p.cover_image_id ? coverImageUrls[p.cover_image_id] : undefined}
                      isDeleting={deletingId === p.id}
                      isUnpublishing={unpublishingId === p.id}
                      onDelete={handleDelete}
                      onUnpublish={handleUnpublish}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Profile tab ──────────────────────────────────────────────── */}
          {activeTab === 'profile' && profile && (
            <div className="space-y-6 max-w-xl">
              {/* Avatar + handle header */}
              <div className="flex items-center gap-4 pb-4 border-b border-line">
                <img
                  src={getAvatarUrl(profile.avatar_url ?? profile.handle ?? '')}
                  alt="avatar"
                  width={48}
                  height={48}
                  className="w-12 h-12 border border-line bg-bg-elevated shrink-0"
                />
                <div>
                  <p className="text-sm text-ink">{profile.nickname}</p>
                  <Link className=' text-xs text-ink-ddim' href={`/@${profile.handle ?? ''}`}>/@{profile.handle ?? ''}</Link>
                </div>
              </div>

              {/* Handle (immutable) */}
              <div className="space-y-1">
                <label className="block text-xs uppercase tracking-widest text-ink-muted">ID（不可修改）</label>
                <div className="flex items-center border border-line bg-bg-elevated px-3 py-2 opacity-60 cursor-not-allowed select-none">
                  <span className="text-ink-disabled text-sm">@</span>
                  <span className="text-sm text-ink ml-0.5">{profile.handle ?? ''}</span>
                </div>
              </div>

              {/* Nickname */}
              <div className="space-y-1">
                <label className="block text-xs uppercase tracking-widest text-ink-muted">
                  顯示名稱 <span className="text-danger">*</span>
                </label>
                <Input
                  size="md"
                  value={draftNickname}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraftNickname(e.target.value)}
                  maxLength={50}
                />
              </div>

              {/* Bio */}
              <div className="space-y-1">
                <label className="block text-xs uppercase tracking-widest text-ink-muted">自我介紹</label>
                <Input
                  as="textarea"
                  size="md"
                  value={draftBio}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDraftBio(e.target.value)}
                  maxLength={200}
                  rows={5}
                  placeholder="簡短介紹自己…"
                  className="resize-none"
                />
                <p className="text-xs text-ink-disabled text-right">{draftBio.length}/200</p>
              </div>

              {/* Affiliation */}
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-widest text-ink-muted">所屬社團</label>
                <div className="flex gap-3 flex-wrap">
                  {AFFILIATIONS.map(aff => (
                    <Button
                      key={aff}
                      type="button"
                      variant="outline"
                      size="md"
                      active={draftAffiliation === aff}
                      onClick={() => setDraftAffiliation(draftAffiliation === aff ? '' : aff)}
                    >
                      {aff}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Age Group */}
              <div className="space-y-2">
                <label className="block text-xs uppercase tracking-widest text-ink-muted">
                  年級身份 <span className="text-ink-disabled text-[10px] normal-case">（選填）</span>
                </label>
                <div className="flex gap-3 flex-wrap">
                  {AGE_GROUPS.map(ag => (
                    <Button
                      key={ag}
                      type="button"
                      variant="outline"
                      size="md"
                      active={draftAgeGroup === ag}
                      onClick={() => setDraftAgeGroup(draftAgeGroup === ag ? '' : ag)}
                    >
                      {ag}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Save */}
              {profileSaveError && (
                <p className="text-sm text-danger border border-danger/30 px-3 py-2">{profileSaveError}</p>
              )}
              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  onClick={saveProfile}
                  disabled={!draftNickname.trim() || profileSaving}
                  className="text-sm px-5"
                >
                  {profileSaving ? '儲存中…' : '儲存變更'}
                </Button>
                {profileSaved && <span className="text-sm text-success">✓ 已儲存</span>}
              </div>

              {/* Survey */}
              {!surveyDone && (
                <div className="pt-4 border-t border-line space-y-2">
                  <p className="text-xs uppercase tracking-widest text-ink-muted">社群問卷</p>
                  <p className="text-xs text-ink-disabled">協助我們了解社群組成，完全匿名，約 1 分鐘。</p>
                  <Button variant="outline" size="md" onClick={() => setShowSurvey(true)}>
                    填寫問卷
                  </Button>
                </div>
              )}
            </div>
          )}
        </main>

        <SurveyModal
          open={showSurvey}
          onClose={() => setShowSurvey(false)}
          onComplete={() => { setShowSurvey(false); setSurveyDone(true) }}
        />

        {showNewModal && (
          <NewProjectModal
            userId={user!.id}
            userHandle={userHandle}
            onCreated={handleProjectCreated}
            onClose={() => setShowNewModal(false)}
          />
        )}

        {dialog}

        {pendingTab && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 font-mono"
            onClick={() => setPendingTab(null)}
          >
            <div
              className="bg-bg border border-line w-full max-w-sm mx-4 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-5 py-3 border-b border-line">
                <p className="text-xs uppercase tracking-widest text-ink-muted">未儲存的變更</p>
              </div>
              <div className="px-5 py-5">
                <p className="text-sm text-ink">個人資料有未儲存的變更，是否儲存後再離開？</p>
              </div>
              <div className="px-5 py-3 flex justify-end gap-2 border-t border-line">
                <Button variant="ghost" onClick={() => setPendingTab(null)} className="text-xs px-3">取消</Button>
                <Button variant="ghost" onClick={handleDiscardAndSwitch} className="text-xs px-3">放棄變更</Button>
                <Button variant="primary" onClick={handleSaveAndSwitch} disabled={profileSaving} className="text-xs px-3">
                  {profileSaving ? '儲存中…' : '儲存'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  )
}
