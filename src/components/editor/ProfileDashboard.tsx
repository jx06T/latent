import { useState, useEffect, useCallback } from 'react'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { supabase } from '@/lib/supabase'
import { publishedUrl, draftKey, toCdnUrl } from '@/lib/image-paths'
import { Button, LinkButton } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { cn } from '@/lib/utils'
import EditorTopBar from '@/components/editor/EditorTopBar'
import NewProjectModal from '@/components/editor/NewProjectModal'
import ProjectListItem, { type ProjectSummary } from '@/components/editor/ProjectListItem'

const AFFILIATIONS = ['建電', '北資', '其他'] as const
const AGE_GROUPS = ['15 歲以下', '15–17 歲', '18–20 歲', '21–23 歲', '24 歲以上'] as const

function dicebearUrl(seed: string) {
  return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(seed || 'default')}`
}

export default function ProfileDashboard() {
  const { user, profile, isLoggedIn, isOnboarded, accessToken, loading: authLoading, signIn, signOut, refreshProfile } = useSupabaseAuth()

  // ── Tab ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'projects' | 'profile'>('projects')

  // ── Projects ───────────────────────────────────────────────────────────
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [coverImageUrls, setCoverImageUrls] = useState<Record<string, string>>({})

  // ── Profile editing ────────────────────────────────────────────────────
  const [draftNickname, setDraftNickname] = useState('')
  const [draftBio, setDraftBio] = useState('')
  const [draftAffiliation, setDraftAffiliation] = useState('')
  const [draftAgeGroup, setDraftAgeGroup] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null)
  const [profileSaved, setProfileSaved] = useState(false)

  const { confirm, dialog } = useConfirm()

  // Sync draft fields when profile loads
  useEffect(() => {
    if (profile) {
      setDraftNickname(profile.nickname)
      setDraftBio(profile.bio ?? '')
      setDraftAffiliation(profile.affiliation ?? '')
      setDraftAgeGroup(profile.age_group ?? '')
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
        .order('created_at', { ascending: false })
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

  const handleProjectCreated = (projectId: string) => {
    window.location.href = `/editor/${projectId}`
  }

  // ── Save profile ───────────────────────────────────────────────────────
  const saveProfile = async () => {
    if (!user || !draftNickname.trim()) return
    setProfileSaving(true)
    setProfileSaveError(null)

    const { error } = await supabase
      .from('profiles')
      .update({
        nickname: draftNickname.trim(),
        bio: draftBio.trim(),
        affiliation: draftAffiliation || null,
        age_group: draftAgeGroup || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      setProfileSaveError(error.message)
    } else {
      await refreshProfile()
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    }
    setProfileSaving(false)
  }

  // ── Loading state ──────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg font-mono text-ink-muted text-sm">
        <span className="animate-pulse">Checking session…</span>
      </div>
    )
  }

  // ── Not logged in ──────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg gap-4 font-mono">
        <div className="border border-line p-8 text-center space-y-4 max-w-sm w-full">
          <p className="text-sm uppercase tracking-widest text-ink-muted">Latent · Profile</p>
          <p className="text-sm text-ink">Sign in to manage your projects</p>
          <button
            onClick={() => signIn()}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-line hover:border-accent-500 hover:text-accent-500 transition-colors font-mono text-sm uppercase"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google Sign In
          </button>
        </div>
      </div>
    )
  }

  const userHandle = profile?.handle ?? (
    user?.user_metadata?.full_name
      ? `${(user.user_metadata.full_name as string).toLowerCase().replace(/\s+/g, '_')}`
      : `${user?.email?.split('@')[0] ?? 'user'}`
  )

  // ── Dashboard ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg font-mono">
      <EditorTopBar
        left={
          <>
            <LinkButton href="/" variant="ghost" className="text-sm">← Home</LinkButton>
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
            <Button variant="ghost" onClick={signOut} className="text-sm px-3">Sign Out</Button>
          </>
        }
      />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex border-b border-line mb-8">
          {(['projects', 'profile'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 text-xs uppercase tracking-widest transition-colors border-b-2 -mb-px',
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
              <span className="text-sm text-ink-disabled">{projects.length} total</span>
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
                    onDelete={handleDelete}
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
                src={dicebearUrl(profile.handle)}
                alt="avatar"
                width={48}
                height={48}
                className="w-12 h-12 border border-line bg-bg-elevated shrink-0"
              />
              <div>
                <p className="text-sm text-ink">{profile.nickname}</p>
                <a
                  href={`/@${profile.handle}`}
                  className="text-xs text-ink-disabled hover:text-ink transition-colors"
                >
                  /@{profile.handle}
                </a>
              </div>
            </div>

            {/* Handle (immutable) */}
            <div className="space-y-1">
              <label className="block text-xs uppercase tracking-widest text-ink-muted">代稱（不可修改）</label>
              <div className="flex items-center border border-line bg-bg-elevated px-3 py-2 opacity-60 cursor-not-allowed select-none">
                <span className="text-ink-disabled text-sm">@</span>
                <span className="text-sm text-ink ml-0.5">{profile.handle}</span>
              </div>
            </div>

            {/* Nickname */}
            <div className="space-y-1">
              <label className="block text-xs uppercase tracking-widest text-ink-muted">
                顯示名稱 <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={draftNickname}
                onChange={e => setDraftNickname(e.target.value)}
                maxLength={50}
                className="w-full bg-transparent border border-line focus:border-line-active transition-colors px-3 py-2 text-sm text-ink placeholder:text-ink-disabled outline-none"
              />
            </div>

            {/* Bio */}
            <div className="space-y-1">
              <label className="block text-xs uppercase tracking-widest text-ink-muted">自我介紹</label>
              <textarea
                value={draftBio}
                onChange={e => setDraftBio(e.target.value)}
                maxLength={200}
                rows={3}
                placeholder="簡短介紹自己…"
                className="w-full bg-transparent border border-line focus:border-line-active transition-colors px-3 py-2 text-sm text-ink placeholder:text-ink-disabled outline-none resize-none"
              />
              <p className="text-xs text-ink-disabled text-right">{draftBio.length}/200</p>
            </div>

            {/* Affiliation */}
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-widest text-ink-muted">所屬社團</label>
              <div className="flex gap-3 flex-wrap">
                {AFFILIATIONS.map(aff => (
                  <button
                    key={aff}
                    type="button"
                    onClick={() => setDraftAffiliation(draftAffiliation === aff ? '' : aff)}
                    className={cn(
                      'px-4 py-2 border text-sm transition-colors',
                      draftAffiliation === aff
                        ? 'border-primary-500 text-ink bg-primary-950'
                        : 'border-line text-ink-muted hover:border-line-active hover:text-ink',
                    )}
                  >
                    {aff}
                  </button>
                ))}
              </div>
            </div>

            {/* Age group */}
            <div className="space-y-1">
              <label className="block text-xs uppercase tracking-widest text-ink-muted">年齡區間</label>
              <select
                value={draftAgeGroup}
                onChange={e => setDraftAgeGroup(e.target.value)}
                className="w-full bg-bg-elevated border border-line focus:border-line-active transition-colors px-3 py-2 text-sm text-ink outline-none appearance-none"
              >
                <option value="">（選填）</option>
                {AGE_GROUPS.map(ag => <option key={ag} value={ag}>{ag}</option>)}
              </select>
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
          </div>
        )}
      </main>

      {showNewModal && (
        <NewProjectModal
          userId={user!.id}
          userHandle={userHandle}
          onCreated={handleProjectCreated}
          onClose={() => setShowNewModal(false)}
        />
      )}

      {dialog}
    </div>
  )
}
