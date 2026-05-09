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
  saveError: string | null
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
  saveError,
  userEmail,
  onSave,
  onPublish,
  onSignOut,
}: Props) {
  const isProcessing = status === 'processing'
  const isPublished = status === 'published'
  const canPublish = !isProcessing && !isPublishing && !isSaving

  return (
    <div className="flex items-center gap-2 font-mono *:h-7">
      {/* User info */}
      {userEmail && (
        <div className="hidden sm:flex items-center gap-2 px-3 border border-line bg-bg/80 backdrop-blur-sm">
          <span className="text-success text-xs">●</span>
          <span className="text-ink-muted text-xs truncate max-w-30">{userEmail}</span>
          <Button variant="ghost" size="sm" onClick={onSignOut} className="hover:text-danger">
            signout
          </Button>
        </div>
      )}

      {/* Status badge */}
      <div className="px-3 leading-5.5 border border-line bg-bg/80 backdrop-blur-sm">
        <span className={cn('text-xs uppercase', STATUS_STYLE[status] ?? 'text-ink-muted')}>
          {isProcessing ? '⚙ processing' : status}
        </span>
      </div>

      {/* Save error */}
      {saveError && (
        <div className="px-2 py-1 border border-warning/40 bg-warning/10 text-xs text-warning max-w-50 truncate" title={saveError}>
          {saveError}
        </div>
      )}
      {/* Slug conflict error */}
      {slugError && (
        <div className="px-2 py-1 border border-danger/40 bg-danger-ghost text-xs text-danger max-w-50 truncate" title={slugError}>
          {slugError}
        </div>
      )}
      {/* Save */}
      <Button
        variant="secondary"
        size="md"
        onClick={onSave}
        disabled={!isDirty || isSaving || isProcessing}
      >
        {isSaving ? 'Saving...' : `Save${(isDirty && !isProcessing) ? '*' : ''}`}
      </Button>

      {/* Publish */}
      <Button
        variant="primary"
        size="md"
        onClick={onPublish}
        disabled={!canPublish || isPublished}
      >
        {isPublishing ? 'Publishing...' : isPublished ? 'Published' : 'Publish →'}
      </Button>
    </div>
  )
}
