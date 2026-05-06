import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const STATUS_STYLE: Record<string, string> = {
  draft: 'text-warning',
  processing: 'text-info animate-pulse',
  published: 'text-success',
}

interface Props {
  status: string
  isDirty: boolean
  isSaving: boolean
  isPublishing: boolean
  slugError: string | null
  userEmail: string | undefined
  onSave: () => void
  onPublish: () => void
  onSignOut: () => void
}

export default function ActionIsland({
  status,
  isDirty,
  isSaving,
  isPublishing,
  slugError,
  userEmail,
  onSave,
  onPublish,
  onSignOut,
}: Props) {
  const isProcessing = status === 'processing'
  const isPublished = status === 'published'
  const canPublish = !isProcessing && !isPublishing && !isSaving

  return (
    <div className="flex items-center gap-2 font-mono">
      {/* User info */}
      {userEmail && (
        <div className="hidden sm:flex items-center gap-2 px-2 py-1 border border-line bg-bg/80 backdrop-blur-sm">
          <span className="text-success text-[9px]">●</span>
          <span className="text-ink-muted text-[10px] truncate max-w-[120px]">{userEmail}</span>
          <button
            onClick={onSignOut}
            className="text-[9px] text-ink-disabled hover:text-danger transition-colors uppercase"
          >
            out
          </button>
        </div>
      )}

      {/* Status badge */}
      <div className="px-2 py-1 border border-line bg-bg/80 backdrop-blur-sm">
        <span className={cn('text-[10px] uppercase', STATUS_STYLE[status] ?? 'text-ink-muted')}>
          {isProcessing ? '⚙ processing' : status}
        </span>
      </div>

      {/* Slug conflict error */}
      {slugError && (
        <div className="px-2 py-1 border border-danger/40 bg-danger-ghost text-[10px] text-danger max-w-[200px] truncate">
          {slugError}
        </div>
      )}

      {/* Unsaved indicator */}
      {isDirty && !isProcessing && (
        <span className="text-[9px] text-warning/80 uppercase hidden sm:block">unsaved</span>
      )}

      {/* Save */}
      <Button
        variant="secondary"
        onClick={onSave}
        disabled={!isDirty || isSaving || isProcessing}
        className="px-3"
      >
        {isSaving ? 'Saving...' : 'Save'}
      </Button>

      {/* Publish */}
      <Button
        variant="primary"
        onClick={onPublish}
        disabled={!canPublish || isPublished}
        className="px-3"
      >
        {isPublishing ? 'Publishing...' : isPublished ? 'Published' : 'Publish →'}
      </Button>
    </div>
  )
}
