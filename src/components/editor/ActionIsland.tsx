import { Button } from '@/components/ui/Button'
import { STATUS_STYLE } from '@/lib/project-status'
import { cn } from '@/lib/utils'

export interface ActionState {
  status: string
  isDirty: boolean
  isSaving: boolean
  isPublishing: boolean
  error: string | null
}

interface Props {
  state: ActionState
  userEmail?: string
  onSave(): void
  onPublish(): void
  onSignOut(): void
}

export default function ActionIsland({ state, userEmail, onSave, onPublish, onSignOut }: Props) {
  const { status, isDirty, isSaving, isPublishing, error } = state
  const isProcessing = status === 'processing'
  const isPublished = status === 'published'
  const canPublish = !isProcessing && !isPublishing && !isSaving

  return (
    <div className="flex items-center gap-2 font-mono *:h-7">
      {userEmail && (
        <div className="hidden sm:flex items-center gap-2 px-3 border border-line bg-bg/80 backdrop-blur-sm">
          <span className="text-success text-xs">●</span>
          <span className="text-ink-muted text-xs truncate max-w-30">{userEmail}</span>
          <Button variant="ghost" size="sm" onClick={onSignOut} className="hover:text-danger">
            signout
          </Button>
        </div>
      )}

      <div className="px-3 leading-5.5 border border-line bg-bg/80 backdrop-blur-sm">
        <span className={cn('text-xs uppercase', STATUS_STYLE[status] ?? 'text-ink-muted')}>
          {isProcessing ? '⚙ processing' : status}
        </span>
      </div>

      {error && (
        <div className="px-2 py-1 border border-danger/40 bg-danger-ghost text-xs text-danger max-w-50 truncate" title={error}>
          {error}
        </div>
      )}

      <Button
        variant="secondary"
        size="md"
        onClick={onSave}
        disabled={!isDirty || isSaving || isProcessing}
      >
        {isSaving ? 'Saving...' : `Save${isDirty && !isProcessing ? '*' : ''}`}
      </Button>

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
