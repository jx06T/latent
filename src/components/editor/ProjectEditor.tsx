import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { supabase } from '@/lib/supabase'
import { uploadToR2 } from '@/lib/image-upload'
import { publishedUrl, type ProjectImageRow } from '@/lib/image-paths'
import { isValidSlug } from '@/lib/slug'
import { LinkButton } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import EditorTopBar from '@/components/editor/EditorTopBar'
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

function countImageRefs(content: string, imageId: string): number {
  const esc = imageId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return (content.match(new RegExp(`image-id-${esc}`, 'g')) ?? []).length
}

export default function ProjectEditor({ projectId }: Props) {
  const { user, isLoggedIn, accessToken, loading: authLoading, signIn, signOut } = useSupabaseAuth()
  const { confirm, dialog } = useConfirm()

  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading')
  const [projectStatus, setProjectStatus] = useState('draft')
  const [formState, setFormState] = useState<FormState>(EMPTY_FORM)
  const [savedState, setSavedState] = useState<FormState>(EMPTY_FORM)
  const [images, setImages] = useState<ImageRecord[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [slugError, setSlugError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const markdownRef = useRef<MarkdownEditorHandle>(null)

  const isDirty = JSON.stringify(formState) !== JSON.stringify(savedState)

  // ── Load project ────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return
    if (!isLoggedIn) { setLoadStatus('auth-required'); return }

    setLoadStatus('loading')
    supabase
      .from('projects')
      .select('*, project_images!project_images_project_id_fkey(*)')
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
          (imgs ?? []).map((img: any): ImageRecord => {
            let previewUrl: string | undefined
            if (img.status === 'published' && img.published_ext && img.available_sizes?.length) {
              try { previewUrl = publishedUrl(img as ProjectImageRow, 'md') } catch { }
            }
            return {
              id: img.id,
              project_id: img.project_id,
              status: img.status,
              source_ext: img.source_ext,
              published_ext: img.published_ext,
              available_sizes: img.available_sizes,
              created_at: img.created_at,
              previewUrl,
            }
          }),
        )
        setLoadStatus('ready')
      })
  }, [authLoading, isLoggedIn, user?.id, projectId])

  // ── Realtime: watch status while processing ─────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`editor-status-${projectId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` },
        payload => {
          const next = (payload.new as any).status as string
          setProjectStatus(next)
          // Reload images after processing completes so thumbnails and CDN URLs update
          if (next === 'published') {
            supabase
              .from('project_images')
              .select('*')
              .eq('project_id', projectId)
              .then(({ data }) => {
                if (!data) return
                setImages(data.map((img: any): ImageRecord => {
                  let previewUrl: string | undefined
                  if (img.status === 'published' && img.published_ext && img.available_sizes?.length) {
                    try { previewUrl = publishedUrl(img as ProjectImageRow, 'md') } catch { }
                  }
                  return {
                    id: img.id, project_id: img.project_id, status: img.status,
                    source_ext: img.source_ext, published_ext: img.published_ext,
                    available_sizes: img.available_sizes, created_at: img.created_at,
                    previewUrl,
                  }
                }))
              })
          }
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [projectId])

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

    setSaveError(null)
    if (!isValidSlug(formState.slug)) {
      setSaveError('Slug 格式不正確 (需為 3-60 字元的小寫英數字與連字號)')
      return
    }

    setIsSaving(true)
    try {
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
      if (!error) {
        setSavedState({ ...formState })
        // Auto-trigger image processing when a published project has pending draft images
        if (projectStatus === 'published' && images.some(img => img.status === 'draft')) {
          const res = await fetch('/api/images/process-pending', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
            body: JSON.stringify({ project_id: projectId }),
          })
          if (res.ok) setProjectStatus('processing')
        }
      } else {
        setSaveError(error.message)
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setIsSaving(false)
    }
  }, [accessToken, projectId, formState, projectStatus, images])

  // ── Publish ─────────────────────────────────────────────────────────────
  const handlePublish = useCallback(async () => {
    if (!accessToken) return
    const ok = await confirm({
      title: '確認發布',
      message: `發布後 slug「${formState.slug}」將無法更改。\n確認要發布嗎？`,
      confirmText: '發布',
      variant: 'primary',
    })
    if (!ok) return
    setIsPublishing(true)
    setSlugError(null)

    try {
      await handleSave()

      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ project_id: projectId }),
      })

      let data: any = {}
      try { data = await res.json() } catch { /* ignore parse error if response is not JSON */ }

      if (!res.ok) {
        if (res.status === 409 && data.conflicting_field === 'slug') {
          setSlugError(data.message ?? 'Slug conflict')
        } else {
          setSlugError(data.error ?? data.message ?? `Publish failed (HTTP ${res.status})`)
        }
        return
      }

      setProjectStatus('processing')
    } catch (err) {
      setSlugError(err instanceof Error ? err.message : 'Network error during publish')
    } finally {
      setIsPublishing(false)
    }
  }, [accessToken, projectId, handleSave, confirm, formState.slug])

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
    const refs = countImageRefs(formState.content, imageId)
    const ok = await confirm({
      title: '刪除圖片',
      message: refs > 0
        ? `此操作將刪除文章中的 ${refs} 個連結，且無法復原。`
        : '確認刪除此圖片？此操作無法復原。',
      confirmText: '刪除',
      variant: 'danger',
    })
    if (!ok) return
    const res = await fetch(`/api/images/${imageId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const data = await res.json()
    if (!res.ok) throw new Error((data.error as string) ?? `HTTP ${res.status}`)
    const esc = imageId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    setImages(prev => prev.filter(img => img.id !== imageId))
    setFormState(prev => ({
      ...prev,
      content: prev.content.replace(
        new RegExp(`!\\[([^\\]]*)\\]\\(image-id-${esc}\\)`, 'g'),
        '',
      ),
      cover_image_id: prev.cover_image_id === imageId ? null : prev.cover_image_id,
    }))
    setSavedState(prev =>
      prev.cover_image_id === imageId ? { ...prev, cover_image_id: null } : prev,
    )
  }, [accessToken, confirm, formState.content])

  // ── Image: seamless replace ─────────────────────────────────────────────
  const handleSeamlessSwap = useCallback(async (oldId: string, file: File) => {
    if (!accessToken) throw new Error('Not authenticated')
    const refs = countImageRefs(formState.content, oldId)
    const ok = await confirm({
      title: '替換圖片',
      message: refs > 0
        ? `此操作將替換文章中的 ${refs} 個連結。\n舊圖片將永久刪除。`
        : '確認替換此圖片？舊圖片將永久刪除。',
      confirmText: '替換',
      variant: 'primary',
    })
    if (!ok) return
    // 1. Upload new
    const { image_id: newId, preview_url } = await uploadToR2(file, projectId, accessToken)
    // 2. Update markdown refs
    setFormState(prev => ({
      ...prev,
      content: prev.content.replace(
        new RegExp(`image-id-${oldId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'),
        `image-id-${newId}`,
      ),
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
    // 4. Delete old from API
    const res = await fetch(`/api/images/${oldId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) throw new Error(`Delete old image failed: HTTP ${res.status}`)
    // 5. Remove old from list
    setImages(prev => prev.filter(img => img.id !== oldId))
  }, [accessToken, projectId, confirm, formState.content])

  // ── Image: insert into editor ───────────────────────────────────────────
  const handleInsertImage = useCallback((imageId: string) => {
    markdownRef.current?.insertAtCursor(`![](image-id-${imageId})`)
  }, [])

  // ── Image: set cover ────────────────────────────────────────────────────
  const handleSetCover = useCallback(async (imageId: string | null) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ cover_image_id: imageId })
        .eq('id', projectId)
      if (error) throw error
      setFormState(prev => ({ ...prev, cover_image_id: imageId }))
      setSavedState(prev => ({ ...prev, cover_image_id: imageId }))
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update cover image')
    }
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

  // ── Image URL map for markdown preview ─────────────────────────────────
  const imageUrlMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const img of images) {
      if (img.previewUrl) {
        map[img.id] = img.previewUrl
      } else if (img.status === 'published' && img.published_ext && img.available_sizes?.length) {
        try { map[img.id] = publishedUrl(img as unknown as ProjectImageRow, 'md') } catch { }
      }
    }
    return map
  }, [images])

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
          onClick={() => signIn()}
          className="border border-line px-4 py-2 text-xs uppercase hover:border-accent-500 hover:text-accent-500 transition-colors"
        >
          Google Sign In
        </button>
      </div>
    )
  }

  if (loadStatus === 'forbidden') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-bg gap-2 font-mono text-sm">
        <p className="text-danger uppercase">Access denied</p>
        <p className="text-ink-muted">This project does not belong to your account.</p>
        <LinkButton href="/profile" variant="outline" className="mt-2">← Profile</LinkButton>
      </div>
    )
  }

  if (loadStatus === 'error') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-bg gap-2 font-mono text-sm">
        <p className="text-danger uppercase">Failed to load project</p>
        <LinkButton href="/profile" variant="outline" className="mt-2">← Profile</LinkButton>
      </div>
    )
  }

  const isProcessing = projectStatus === 'processing'

  // ── Render: editor ──────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-bg text-ink overflow-hidden">
      <EditorTopBar
        left={
          <LinkButton href="/profile" variant="ghost" className="text-sm">← Profile</LinkButton>
        }
        center={false
          ? <span className="text-xs text-info animate-pulse font-mono uppercase tracking-wider">⚙ Processing… editing locked</span>
          : null
        }
        right={
          <ActionIsland
            status={projectStatus}
            isDirty={isDirty}
            isSaving={isSaving}
            isPublishing={isPublishing}
            slugError={slugError}
            saveError={saveError}
            userEmail={user?.email}
            onSave={handleSave}
            onPublish={handlePublish}
            onSignOut={signOut}
          />
        }
      />

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
            onReplace={handleSeamlessSwap}
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
            disabled={isProcessing}
            slugError={slugError}
          />
          <div className="border-t border-line">
            <MarkdownEditor
              ref={markdownRef}
              content={formState.content}
              onChange={v => handleFormChange('content', v)}
              disabled={isProcessing}
              onImageDrop={isProcessing ? undefined : handleMarkdownImageDrop}
              imageUrlMap={imageUrlMap}
            />
          </div>
        </div>
      </div>

      {dialog}
    </div>
  )
}
