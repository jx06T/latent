import { useState, useEffect, useCallback } from 'react'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { supabase } from '@/lib/supabase'
import { Button, LinkButton } from '@/components/ui/Button'
import NewProjectModal from '@/components/editor/NewProjectModal'

interface ProjectSummary {
  id: string
  title: string
  slug: string
  status: string
  year: number
  updated_at: string | null
}

const STATUS_COLOR: Record<string, string> = {
  draft: 'text-warning',
  processing: 'text-info animate-pulse',
  published: 'text-success',
}

const STATUS_DOT: Record<string, string> = {
  draft: '○',
  processing: '⚙',
  published: '●',
}

export default function ProfileDashboard() {
  const { user, isLoggedIn, loading: authLoading, signIn, signOut } = useSupabaseAuth()
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewModal, setShowNewModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ── Access token from session ─────────────────────────────────────────
  const [accessToken, setAccessToken] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAccessToken(session?.access_token ?? null)
    })
  }, [isLoggedIn])

  // ── Load projects ─────────────────────────────────────────────────────
  const loadProjects = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    const { data } = await supabase
      .from('projects')
      .select('id, title, slug, status, year, updated_at')
      .eq('author_id', user.id)
      .order('updated_at', { ascending: false })
    setProjects((data ?? []) as ProjectSummary[])
    setIsLoading(false)
  }, [user])

  useEffect(() => {
    if (!authLoading && isLoggedIn) loadProjects()
    else if (!authLoading) setIsLoading(false)
  }, [authLoading, isLoggedIn, loadProjects])

  // ── Delete project ────────────────────────────────────────────────────
  const handleDelete = useCallback(async (id: string) => {
    if (!accessToken) return
    if (!confirm('Delete this project and all its images? This cannot be undone.')) return
    setDeletingId(id)
    const res = await fetch(`/api/projects/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (res.ok) {
      setProjects(prev => prev.filter(p => p.id !== id))
    }
    setDeletingId(null)
  }, [accessToken])

  // ── New project created ───────────────────────────────────────────────
  const handleProjectCreated = (projectId: string) => {
    window.location.href = `/editor/${projectId}`
  }

  // ── Loading state ─────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg font-mono text-ink-muted text-xs">
        <span className="animate-pulse">Checking session…</span>
      </div>
    )
  }

  // ── Not logged in ─────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg gap-4 font-mono">
        <div className="border border-line p-8 text-center space-y-4 max-w-sm w-full">
          <p className="text-xs uppercase tracking-widest text-ink-muted">Latent · Profile</p>
          <p className="text-ink text-sm">Sign in to manage your projects</p>
          <button
            onClick={()=>signIn()}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-line hover:border-accent-500 hover:text-accent-500 transition-colors font-mono text-xs uppercase"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google Sign In
          </button>
        </div>
      </div>
    )
  }

  const userHandle = user?.user_metadata?.full_name
    ? `@${(user.user_metadata.full_name as string).toLowerCase().replace(/\s+/g, '_')}`
    : `@${user?.email?.split('@')[0] ?? 'user'}`

  // ── Dashboard ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg font-mono">
      {/* Top bar */}
      <header className="border-b border-line px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LinkButton href="/" variant="ghost" className="text-[10px]">← Home</LinkButton>
          <span className="w-px h-4 bg-line" />
          <span className="text-xs text-ink-muted">{userHandle}</span>
          <span className="text-[10px] text-ink-disabled truncate max-w-[200px] hidden sm:block">
            {user?.email}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={() => setShowNewModal(true)}>
            + New Project
          </Button>
          <Button variant="ghost" onClick={signOut}>Sign Out</Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-sm uppercase tracking-widest text-ink">Projects</h1>
          <span className="text-[10px] text-ink-disabled">{projects.length} total</span>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-ink-muted text-xs animate-pulse">Loading…</div>
        ) : projects.length === 0 ? (
          <div className="border border-dashed border-line text-center py-12 space-y-3">
            <p className="text-ink-muted text-xs">No projects yet</p>
            <Button variant="outline" onClick={() => setShowNewModal(true)}>
              Create your first project
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-line border border-line">
            {projects.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-bg-surface transition-colors group">
                {/* Status dot */}
                <span className={`text-sm ${STATUS_COLOR[p.status] ?? 'text-ink-muted'} shrink-0`} title={p.status}>
                  {STATUS_DOT[p.status] ?? '?'}
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-ink font-medium truncate">{p.title || '(untitled)'}</span>
                    <span className="text-[9px] text-ink-disabled shrink-0">{p.year}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-ink-disabled">
                    <span>/{p.slug}</span>
                    <span>·</span>
                    <span className={STATUS_COLOR[p.status] ?? ''}>{p.status}</span>
                    {p.updated_at && (
                      <>
                        <span>·</span>
                        <span>{new Date(p.updated_at).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <LinkButton
                    href={`/editor/${p.id}`}
                    variant="outline"
                    className="text-[9px] px-2 py-0.5"
                  >
                    Edit
                  </LinkButton>
                  {p.status === 'published' && (
                    <LinkButton
                      href={`/projects/${p.year}/${p.slug}`}
                      variant="ghost"
                      className="text-[9px] px-2 py-0.5"
                      target="_blank"
                    >
                      View ↗
                    </LinkButton>
                  )}
                  <Button
                    variant="danger"
                    className="text-[9px] px-2 py-0.5"
                    disabled={deletingId === p.id || p.status === 'processing'}
                    onClick={() => handleDelete(p.id)}
                  >
                    {deletingId === p.id ? '…' : 'Del'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* New project modal */}
      {showNewModal && (
        <NewProjectModal
          userId={user!.id}
          userHandle={userHandle}
          onCreated={handleProjectCreated}
          onClose={() => setShowNewModal(false)}
        />
      )}
    </div>
  )
}
