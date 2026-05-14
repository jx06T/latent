import { Button, LinkButton } from '@/components/ui/Button'
import type { ProjectImageRow } from '@/lib/image-paths'

export interface ProjectSummary {
  id: string
  title: string
  slug: string
  status: string
  year: number
  updated_at: string | null
  created_at: string
  cover_image_id: string | null
  cover_image?: ProjectImageRow
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

interface Props {
  project: ProjectSummary
  coverUrl?: string
  isDeleting: boolean
  isUnpublishing?: boolean
  onDelete: (id: string, title: string) => void
  onUnpublish?: (id: string, title: string) => void
}

export default function ProjectListItem({ project: p, coverUrl, isDeleting, isUnpublishing, onDelete, onUnpublish }: Props) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-bg-surface transition-colors group">
      {/* Status dot */}
      <span className={`text-sm ${STATUS_COLOR[p.status] ?? 'text-ink-muted'} shrink-0`} title={p.status}>
        {STATUS_DOT[p.status] ?? '?'}
      </span>

      {/* Cover image */}
      <div
        className={`hidden sm:flex w-12 h-8 shrink-0 border border-line items-center justify-center overflow-hidden bg-bg-surface ${p.cover_image_id && coverUrl ? '' : 'text-ink-disabled text-[9px]'}`}
        title={p.cover_image_id ? 'Cover Image' : 'No Cover Image'}
      >
        {p.cover_image_id && coverUrl ? (
          <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          '---'
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-base text-ink font-medium truncate">{p.title || '(untitled)'}</span>
          <span className="text-sm text-ink-dim shrink-0">{p.year}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-ink-dim">
          <span>/{p.slug}</span>
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
      <div className="flex items-center gap-2.5 shrink-0">
        {p.status === 'published' && (
          <LinkButton
            href={`/projects/${p.year}/${p.slug}`}
            variant="ghost"
            className="text-xs px-2 py-0.5"
            isExternal
            showIcon
          >
            View
          </LinkButton>
        )}
        <LinkButton href={`/editor/${p.id}`} variant="outline" className="text-xs px-2 py-0.5">
          Edit
        </LinkButton>

        {p.status === 'published' && onUnpublish && (
          <Button
            variant="danger"
            className="text-xs px-2 py-0.5"
            disabled={isUnpublishing}
            onClick={() => onUnpublish(p.id, p.title)}
          >
            {isUnpublishing ? '…' : 'Unpublish'}
          </Button>
        )}
        <Button
          variant="danger"
          className="text-xs px-2 py-0.5"
          disabled={isDeleting || p.status === 'processing'}
          onClick={() => onDelete(p.id, p.title)}
        >
          {isDeleting ? '…' : 'Del'}
        </Button>
      </div>
    </div>
  )
}
