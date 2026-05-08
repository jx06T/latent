import { useProjectEditor } from '@/hooks/useProjectEditor'
import { LinkButton } from '@/components/ui/Button'
import EditorTopBar from '@/components/editor/EditorTopBar'
import ActionIsland from '@/components/editor/ActionIsland'
import ImageSidebar from '@/components/editor/ImageSidebar'
import MetadataForm from '@/components/editor/MetadataForm'
import MarkdownEditor from '@/components/editor/MarkdownEditor'

interface Props {
  projectId: string
}

export default function ProjectEditor({ projectId }: Props) {
  const {
    user,
    authLoading,
    signIn,
    signOut,
    loadStatus,
    projectStatus,
    formState,
    images,
    isSaving,
    isPublishing,
    slugError,
    saveError,
    isDirty,
    markdownRef,
    handleFormChange,
    handleSave,
    handlePublish,
    handleUpload,
    handleDeleteImage,
    handleSeamlessSwap,
    handleInsertImage,
    handleSetCover,
    handleMarkdownImageDrop,
    imageUrlMap,
    dialog,
  } = useProjectEditor(projectId)

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
