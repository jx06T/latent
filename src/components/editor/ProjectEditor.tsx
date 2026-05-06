import { useState, useEffect, useCallback, useRef } from 'react'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { supabase } from '@/lib/supabase'
import { uploadToR2, resizeImage } from '@/lib/image-upload'
import { LinkButton } from '@/components/ui/Button'
import ActionIsland from '@/components/editor/ActionIsland'
import ImageSidebar, { type ImageRecord } from '@/components/editor/ImageSidebar'
import MetadataForm, { type FormState } from '@/components/editor/MetadataForm'
import MarkdownEditor, { type MarkdownEditorHandle } from '@/components/editor/MarkdownEditor'

const EMPTY_FORM: FormState = {
  title: '',
  subtitle: '',
  slug: '',
  description: '',
  content: '',
  category_main: 0,
  category_sub: [],
  keywords: [],
  tech_stack: [],
  links: {},
  cover_image_id: null,
}

type LoadStatus = 'loading' | 'auth-required' | 'forbidden' | 'error' | 'ready'

interface Props {
  projectId: string
}

export default function ProjectEditor({ projectId }: Props) {
  const { user, isLoggedIn, accessToken, loading: authLoading, signIn, signOut } = useSupabaseAuth()

  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading')
  const [projectStatus, setProjectStatus] = useState('draft')
  const [formState, setFormState] = useState<FormState>(EMPTY_FORM)
  const [savedState, setSavedState] = useState<FormState>(EMPTY_FORM)
  const [images, setImages] = useState<ImageRecord[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [slugError, setSlugError] = useState<string | null>(null)

  const markdownRef = useRef<MarkdownEditorHandle>(null)

  const isDirty = JSON.stringify(formState) !== JSON.stringify(savedState)

  // ── Load project ────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return
    if (!isLoggedIn) { setLoadStatus('auth-required'); return }

    setLoadStatus('loading')
    supabase
      .from('projects')
      .select('*, project_images(*)')
      .eq('id', projectId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setLoadStatus('error'); return }
        if (data.author_id !== user?.id) { setLoadStatus('forbidden'); return }

        const { project_images: imgs, ...project } = data as any
        const initial: FormState = {
          title: project.title ?? '',
          subtitle: project.subtitle ?? '',
          slug: project.slug ?? '',
          description: project.description ?? '',
          content: project.content ?? '',
          category_main: project.category_main ?? 0,
          category_sub: project.category_sub ?? [],
          keywords: project.keywords ?? [],
          tech_stack: project.tech_stack ?? [],
          links: (project.links as Record<string, string>) ?? {},
          cover_image_id: project.cover_image_id ?? null,
        }
        setProjectStatus(project.status ?? 'draft')
        setFormState(initial)
        setSavedState(initial)
        setImages(
          (imgs ?? []).map((img: any): ImageRecord => ({
            id: img.id,
            project_id: img.project_id,
            status: img.status,
            source_ext: img.source_ext,
            published_ext: img.published_ext,
            available_sizes: img.available_sizes,
            created_at: img.created_at,
            previewUrl: undefined,
          })),
        )
        setLoadStatus('ready')
      })
  }, [authLoading, isLoggedIn, user?.id, projectId])

  // ── Realtime: watch status while processing ─────────────────────────────
  useEffect(() => {
    if (projectStatus !== 'processing') return
    const channel = supabase
      .channel(`editor-status-${projectId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` },
        payload => {
          const next = (payload.new as any).status as string
          setProjectStatus(next)
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [projectStatus, projectId])

  // ── Beforeunload guard ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (isDirty) e.preventDefault() }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  // ── Ctrl+S shortcut ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (isDirty && !isSaving) handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isDirty, isSaving]) // eslint-disable-line

  // ── Field change helper ─────────────────────────────────────────────────
  const handleFormChange = useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) =>
      setFormState(prev => ({ ...prev, [field]: value })),
    [],
  )

  // ── Save ────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!accessToken) return
    setIsSaving(true)
    const { error } = await supabase
      .from('projects')
      .update({
        title: formState.title,
        subtitle: formState.subtitle || null,
        slug: formState.slug,
        description: formState.description || null,
        content: formState.content || null,
        category_main: formState.category_main,
        category_sub: formState.category_sub,
        keywords: formState.keywords,
        tech_stack: formState.tech_stack,
        links: formState.links,
        cover_image_id: formState.cover_image_id,
      })
      .eq('id', projectId)
    if (!error) setSavedState({ ...formState })
    setIsSaving(false)
  }, [accessToken, projectId, formState])

  // ── Publish ─────────────────────────────────────────────────────────────
  const handlePublish = useCallback(async () => {
    if (!accessToken) return
    setIsPublishing(true)
    setSlugError(null)
    await handleSave()
    const res = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ project_id: projectId }),
    })
    const data = await res.json()
    if (!res.ok) {
      if (res.status === 409 && (data as any).conflicting_field === 'slug') {
        setSlugError((data as any).message ?? 'Slug conflict')
      }
      setIsPublishing(false)
      return
    }
    setProjectStatus('processing')
    setIsPublishing(false)
  }, [accessToken, projectId, handleSave])

  // ── Image: upload ───────────────────────────────────────────────────────
  const handleUpload = useCallback(async (file: File) => {
    if (!accessToken) throw new Error('Not authenticated')
    const { image_id, preview_url } = await uploadToR2(file, projectId, accessToken)
    setImages(prev => [
      ...prev,
      {
        id: image_id,
        project_id: projectId,
        status: 'draft',
        source_ext: 'jpg',
        published_ext: null,
        available_sizes: null,
        created_at: new Date().toISOString(),
        previewUrl: preview_url,
      },
    ])
  }, [accessToken, projectId])

  // ── Image: delete ───────────────────────────────────────────────────────
  const handleDeleteImage = useCallback(async (imageId: string) => {
    if (!accessToken) throw new Error('Not authenticated')
    const res = await fetch(`/api/images/${imageId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const data = await res.json()
    if (!res.ok) throw new Error((data.error as string) ?? `HTTP ${res.status}`)
    setImages(prev => prev.filter(img => img.id !== imageId))
    setFormState(prev =>
      prev.cover_image_id === imageId ? { ...prev, cover_image_id: null } : prev,
    )
    setSavedState(prev =>
      prev.cover_image_id === imageId ? { ...prev, cover_image_id: null } : prev,
    )
  }, [accessToken])

  // ── Image: replace draft (PUT) ──────────────────────────────────────────
  const handleReplaceImage = useCallback(async (imageId: string, file: File) => {
    if (!accessToken) throw new Error('Not authenticated')
    const blob = await resizeImage(file)
    const res = await fetch(`/api/images/${imageId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ content_type: blob.type, file_size: blob.size }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error((data.error as string) ?? `HTTP ${res.status}`)
    const { upload_url, preview_url } = data as { upload_url: string; preview_url: string }
    const put = await fetch(upload_url, { method: 'PUT', body: blob, headers: { 'Content-Type': blob.type } })
    if (!put.ok) throw new Error(`R2 PUT ${put.status}`)
    setImages(prev => prev.map(img => img.id === imageId ? { ...img, previewUrl: preview_url } : img))
  }, [accessToken])

  // ── Image: seamless swap (published) ────────────────────────────────────
  const handleSeamlessSwap = useCallback(async (oldId: string, file: File) => {
    if (!accessToken) throw new Error('Not authenticated')
    // 1. Upload new
    const { image_id: newId, preview_url } = await uploadToR2(file, projectId, accessToken)
    // 2. Update markdown
    setFormState(prev => ({
      ...prev,
      content: prev.content.replace(new RegExp(oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newId),
    }))
    // 3. Add new image record
    setImages(prev => [
      ...prev,
      {
        id: newId, project_id: projectId, status: 'draft', source_ext: 'jpg',
        published_ext: null, available_sizes: null, created_at: new Date().toISOString(),
        previewUrl: preview_url,
      },
    ])
    // 4. Delete old
    const res = await fetch(`/api/images/${oldId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) throw new Error(`Delete old image failed: HTTP ${res.status}`)
    // 5. Remove old from list
    setImages(prev => prev.filter(img => img.id !== oldId))
  }, [accessToken, projectId])

  // ── Image: insert into editor ───────────────────────────────────────────
  const handleInsertImage = useCallback((imageId: string) => {
    markdownRef.current?.insertAtCursor(`![](${imageId})`)
  }, [])

  // ── Image: set cover ────────────────────────────────────────────────────
  const handleSetCover = useCallback(async (imageId: string | null) => {
    await supabase
      .from('projects')
      .update({ cover_image_id: imageId })
      .eq('id', projectId)
    setFormState(prev => ({ ...prev, cover_image_id: imageId }))
    setSavedState(prev => ({ ...prev, cover_image_id: imageId }))
  }, [projectId])

  // ── Image drop from MarkdownEditor ──────────────────────────────────────
  const handleMarkdownImageDrop = useCallback(async (file: File): Promise<string> => {
    if (!accessToken) throw new Error('Not authenticated')
    const { image_id, preview_url } = await uploadToR2(file, projectId, accessToken)
    setImages(prev => [
      ...prev,
      {
        id: image_id, project_id: projectId, status: 'draft', source_ext: 'jpg',
        published_ext: null, available_sizes: null, created_at: new Date().toISOString(),
        previewUrl: preview_url,
      },
    ])
    return image_id
  }, [accessToken, projectId])

  // ── Render: non-ready states ────────────────────────────────────────────
  if (loadStatus === 'loading' || authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-bg font-mono text-ink-muted text-xs">
        <span className="animate-pulse">Loading editor…</span>
      </div>
    )
  }

  if (loadStatus === 'auth-required') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-bg gap-4 font-mono">
        <p className="text-ink-muted text-xs uppercase tracking-wider">Sign in to access the editor</p>
        <button
          onClick={signIn}
          className="border border-line px-4 py-2 text-xs uppercase hover:border-accent-500 hover:text-accent-500 transition-colors"
        >
          Google Sign In
        </button>
      </div>
    )
  }

  if (loadStatus === 'forbidden') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-bg gap-2 font-mono text-xs">
        <p className="text-danger uppercase">Access denied</p>
        <p className="text-ink-muted">This project does not belong to your account.</p>
        <LinkButton href="/profile" variant="outline" className="mt-2">← Profile</LinkButton>
      </div>
    )
  }

  if (loadStatus === 'error') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-bg gap-2 font-mono text-xs">
        <p className="text-danger uppercase">Failed to load project</p>
        <LinkButton href="/profile" variant="outline" className="mt-2">← Profile</LinkButton>
      </div>
    )
  }

  const isProcessing = projectStatus === 'processing'

  // ── Render: editor ──────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-bg text-ink overflow-hidden">
      {/* ── Floating top bar ── */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-line bg-bg z-10">
        <LinkButton href="/profile" variant="ghost" className="text-[10px]">
          ← Profile
        </LinkButton>

        {isProcessing && (
          <div className="absolute left-1/2 -translate-x-1/2 text-[10px] text-info animate-pulse font-mono uppercase tracking-wider">
            ⚙ Processing… editing locked
          </div>
        )}

        <ActionIsland
          status={projectStatus}
          isDirty={isDirty}
          isSaving={isSaving}
          isPublishing={isPublishing}
          slugError={slugError}
          userEmail={user?.email}
          onSave={handleSave}
          onPublish={handlePublish}
          onSignOut={signOut}
        />
      </div>

      {/* ── Main: sidebar + content ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-52 xl:w-64 shrink-0 border-r border-line overflow-hidden flex flex-col">
          <ImageSidebar
            images={images}
            coverId={formState.cover_image_id}
            disabled={isProcessing}
            onUpload={handleUpload}
            onDelete={handleDeleteImage}
            onReplace={handleReplaceImage}
            onSeamlessSwap={handleSeamlessSwap}
            onInsert={handleInsertImage}
            onSetCover={handleSetCover}
          />
        </div>

        {/* Right main */}
        <div className="flex-1 overflow-y-auto">
          <MetadataForm
            data={formState}
            onChange={handleFormChange}
            isSlugLocked={projectStatus === 'published'}
            slugError={slugError}
          />
          <div className="border-t border-line">
            <MarkdownEditor
              ref={markdownRef}
              content={formState.content}
              onChange={v => handleFormChange('content', v)}
              disabled={isProcessing}
              onImageDrop={isProcessing ? undefined : handleMarkdownImageDrop}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
