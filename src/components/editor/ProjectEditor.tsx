import { useState, useEffect, useRef, useCallback } from 'react'
import { useProjectEditor } from '@/hooks/useProjectEditor'
import { Button, LinkButton } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import EditorTopBar from '@/components/editor/EditorTopBar'
import ActionIsland from '@/components/editor/ActionIsland'
import ImageSidebar from '@/components/editor/ImageSidebar'
import MetadataForm from '@/components/editor/MetadataForm'
import MarkdownEditor from '@/components/editor/MarkdownEditor'
import AuthGate from '@/components/ui/AuthGate'

interface Props {
  projectId: string
}

const SIDEBAR_MIN = 160
const SIDEBAR_MAX = 420
const SIDEBAR_DEFAULT = 208 // w-52

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

  // ── Sidebar layout state ────────────────────────────────────────────────
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // ── Drag-to-resize ──────────────────────────────────────────────────────
  const isDraggingRef = useRef(false)
  const dragStartXRef = useRef(0)
  const dragStartWidthRef = useRef(0)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      const delta = e.clientX - dragStartXRef.current
      setSidebarWidth(Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, dragStartWidthRef.current + delta)))
    }
    const onUp = () => { isDraggingRef.current = false }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [])

  const onDragHandleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true
    dragStartXRef.current = e.clientX
    dragStartWidthRef.current = sidebarWidth
    e.preventDefault()
  }, [sidebarWidth])

  // ── Render: non-ready states ────────────────────────────────────────────
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
    <AuthGate
      loading={loadStatus === 'loading' || authLoading}
      loggedIn={loadStatus !== 'auth-required'}
      loadingText="Loading editor…"
      message="Sign in to access the editor"
      onSignIn={signIn}
    >
    <div className="h-screen flex flex-col bg-bg text-ink overflow-hidden">
      <EditorTopBar
        left={
          <>
            <LinkButton href="/profile" variant="ghost" className="text-sm">← Profile</LinkButton>
            {/* Mobile image panel toggle */}
            <Button
              variant="outline"
              className="md:hidden w-7 h-7 p-0 mx-1.5"
              onClick={() => setMobileSidebarOpen(o => !o)}
              title="Toggle image panel"
            >
              {mobileSidebarOpen ? '✕' : '⊞'}
            </Button>
          </>
        }
        right={
          <ActionIsland
            state={{ status: projectStatus, isDirty, isSaving, isPublishing, error: slugError ?? saveError }}
            userEmail={user?.email}
            onSave={handleSave}
            onPublish={handlePublish}
            onSignOut={signOut}
          />
        }
      />

      {/* ── Mobile floating image panel ── */}
      <div
        className={cn(
          'md:hidden fixed top-11 left-0 right-0 z-30 h-[13.3rem] bg-bg-elevated border-b border-line shadow-lg',
          'transition-transform duration-200',
          mobileSidebarOpen ? 'translate-y-0' : '-translate-y-full',
        )}
      >
        <ImageSidebar
          variant="panel"
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

      {/* ── Main: sidebar + content ── */}
      <div className="flex flex-1 overflow-hidden  pt-11">

        {/* Desktop sidebar — hidden on mobile */}
        <div
          className={cn(
            'hidden md:flex shrink-0 border-r border-line flex-col relative overflow-visible',
            sidebarCollapsed ? 'w-7' : '',
          )}
          style={sidebarCollapsed ? undefined : { width: sidebarWidth }}
        >
          {/* Collapse / expand toggle tab */}
          <button
            className="absolute top-0 right-0 z-10 w-7 h-7 flex items-center justify-center border-l border-b border-line bg-bg text-ink-dim hover:text-accent-500 hover:bg-bg-surface transition-colors text-[10px]"
            onClick={() => setSidebarCollapsed(c => !c)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? '›' : '‹'}
          </button>

          {/* Sidebar content */}
          {!sidebarCollapsed && (
            <div className="flex-1 overflow-hidden flex flex-col">
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
          )}

          {/* Drag resize handle — 4px touch target centered on the right border */}
          {!sidebarCollapsed && (
            <div
              className="absolute top-0 bottom-0 w-1 cursor-col-resize group"
              style={{ right: -2 }}
              onMouseDown={onDragHandleMouseDown}
            >
              <div className="absolute inset-y-0 left-0 right-0 group-hover:bg-accent-500/40 transition-colors" />
            </div>
          )}
        </div>

        {/* Right main content */}
        <div
          className={cn(
            'flex-1 overflow-y-auto min-w-0',
            // On mobile: push content below the floating panel when it's open
            mobileSidebarOpen && 'pt-48 md:pt-0',
          )}
        >
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
    </AuthGate>
  )
}
