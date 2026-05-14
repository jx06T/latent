import { useState, useRef, type ChangeEvent, type DragEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { STATUS_STYLE } from '@/lib/project-status'
import { cn } from '@/lib/utils'

export interface ImageRecord {
  id: string
  project_id: string
  status: string
  source_ext: string | null
  published_ext: string | null
  available_sizes: string[] | null
  created_at: string | null
  previewUrl?: string
}

interface Props {
  images: ImageRecord[]
  coverId: string | null
  disabled: boolean
  /** 'sidebar': vertical list (desktop default). 'panel': horizontal scroll (mobile). */
  variant?: 'sidebar' | 'panel'
  onUpload: (file: File) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onReplace: (id: string, file: File) => Promise<void>
  onInsert: (id: string) => void
  onSetCover: (id: string | null) => void
}

// ── Shared action buttons for both variants ────────────────────────────────
interface CardActionsProps {
  id: string
  coverId: string | null
  disabled: boolean
  isReplacing: boolean
  compact?: boolean
  onInsert(id: string): void
  onSetCover(id: string | null): void
  onStartReplace(id: string): void
  onDelete(id: string): void
}

function ImageCardActions({
  id, coverId, disabled, isReplacing, compact = false,
  onInsert, onSetCover, onStartReplace, onDelete,
}: CardActionsProps) {
  const isCover = coverId === id
  const sz = compact ? 'text-[10px] px-1 py-0.5' : 'text-xs px-2 py-0.5'
  return (
    <div className={cn('flex gap-1.5', compact ? 'flex-wrap' : 'flex-wrap')}>
      <Button variant="outline" className={cn(sz, compact && 'flex-1')}
        onClick={() => onInsert(id)} disabled={disabled}>
        Insert
      </Button>
      <Button
        variant={isCover ? 'primary' : 'outline'} className={sz}
        onClick={() => onSetCover(isCover ? null : id)} disabled={disabled}
        title={isCover ? 'Remove cover' : 'Set as cover'}
      >
        {isCover ? 'Uncover' : 'Cover'}
      </Button>
      <Button variant="outline" className={sz}
        disabled={disabled || isReplacing}
        title="Upload replacement (new ID → update markdown → delete old)"
        onClick={() => onStartReplace(id)}
      >
        {isReplacing ? 'Replacing…' : 'Replace'}
      </Button>
      <Button variant="danger" className={sz} disabled={disabled}
        onClick={() => onDelete(id)}>
        Del
      </Button>
    </div>
  )
}

export default function ImageSidebar({
  images, coverId, disabled, variant = 'sidebar',
  onUpload, onDelete, onReplace, onInsert, onSetCover,
}: Props) {
  const [replacingId, setReplacingId] = useState<string | null>(null)
  const [isReplacingId, setIsReplacingId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const replaceInputRef = useRef<HTMLInputElement>(null)

  const wrap = async (fn: () => Promise<void>) => {
    setError(null)
    try { await fn() }
    catch (e) { setError(e instanceof Error ? e.message : 'Operation failed') }
  }

  const onReplaceFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const id = replacingId
    if (file && id) {
      setIsReplacingId(id)
      await wrap(() => onReplace(id, file))
      setIsReplacingId(null)
    }
    e.target.value = ''
    setReplacingId(null)
  }

  const handleUploadFiles = async (files: File[]) => {
    setIsUploading(true)
    for (const f of files) await wrap(() => onUpload(f))
    setIsUploading(false)
  }

  const startReplace = (id: string) => {
    setReplacingId(id)
    replaceInputRef.current?.click()
  }

  // ── Drag-drop (sidebar mode only) ─────────────────────────────────────
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (disabled || isUploading || variant === 'panel') return
    e.preventDefault()
    setIsDraggingOver(true)
  }
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setIsDraggingOver(false)
  }
  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDraggingOver(false)
    if (disabled || isUploading) return
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (!files.length) return
    await handleUploadFiles(files)
  }

  const errorStrip = error && (
    <div className="px-3 py-1 text-xs text-danger bg-danger-ghost border-b border-danger/20 shrink-0">
      {error}
      <button onClick={() => setError(null)} className="ml-2 text-ink-ddim hover:text-ink">×</button>
    </div>
  )

  const uploadLabel = (
    <label className={cn(
      'cursor-pointer text-xs text-ink-muted hover:text-accent-500 transition-colors uppercase border-line border p-1 px-2',
      (disabled || isUploading) && 'opacity-40 pointer-events-none',
    )}>
      {isUploading ? 'Uploading…' : '+ Upload'}
      <input
        type="file" accept="image/*" multiple className="hidden"
        disabled={disabled}
        onChange={e => { handleUploadFiles(Array.from(e.target.files ?? [])); e.target.value = '' }}
      />
    </label>
  )

  // ── Panel variant (mobile horizontal scroll) ──────────────────────────
  if (variant === 'panel') {
    return (
      <div className="flex flex-col h-full font-mono text-xs">
        <input ref={replaceInputRef} type="file" accept="image/*" className="hidden" onChange={onReplaceFileChange} />
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-line shrink-0">
          <span className="text-ink-muted uppercase tracking-wider">Images · {images.length}</span>
          {uploadLabel}
        </div>
        {errorStrip}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-2 px-3 py-2 h-full items-start min-w-max">
            {images.length === 0 ? (
              <p className="text-ink-ddim uppercase self-center">
                {isUploading ? 'Uploading…' : 'No images — tap Upload'}
              </p>
            ) : images.map(img => (
              <div key={img.id} className="flex-none w-36 space-y-1">
                <div className="w-full aspect-4/3 bg-bg-elevated border border-line overflow-hidden relative">
                  {img.previewUrl
                    ? <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-[9px] text-ink-ddim uppercase">
                        {img.status === 'published' ? 'CDN' : '…'}
                      </div>
                  }
                  {coverId === img.id && <span className="absolute top-0.5 left-0.5 text-[9px] text-accent-500">◆</span>}
                  {isReplacingId === img.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-bg/75">
                      <span className="text-[9px] text-info animate-pulse uppercase">Replacing…</span>
                    </div>
                  )}
                </div>
                <ImageCardActions
                  id={img.id} coverId={coverId} disabled={disabled}
                  isReplacing={isReplacingId === img.id} compact
                  onInsert={onInsert} onSetCover={onSetCover}
                  onStartReplace={startReplace} onDelete={id => wrap(() => onDelete(id))}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Sidebar variant (desktop default) ─────────────────────────────────
  return (
    <div
      className="relative flex flex-col h-full font-mono text-xs overflow-hidden"
      onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
    >
      <input ref={replaceInputRef} type="file" accept="image/*" className="hidden" onChange={onReplaceFileChange} />

      {isDraggingOver && (
        <div className="absolute inset-0 z-10 flex items-center justify-center border-2 border-dashed border-accent-500 bg-bg/85 pointer-events-none">
          <span className="text-xs text-accent-500 uppercase tracking-widest">Drop to upload</span>
        </div>
      )}

      <div className="flex items-center justify-start gap-4 px-3 py-2 border-b border-line shrink-0">
        <span className="text-sm uppercase text-ink-muted tracking-wider">{images.length} Image</span>
        {uploadLabel}
      </div>
      {errorStrip}

      <div className="flex-1 overflow-y-auto divide-y divide-line">
        {images.length === 0 && (
          <p className="px-3 py-8 text-center text-xs text-ink-ddim uppercase">
            {isUploading ? 'Uploading…' : 'Drop images here or click Upload'}
          </p>
        )}
        {images.map(img => (
          <div key={img.id} className="p-2.5 space-y-2">
            <div className="w-full aspect-video bg-bg-elevated border border-line overflow-hidden relative">
              {img.previewUrl
                ? <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-xs text-ink-ddim uppercase">
                    {img.status === 'published' ? 'CDN' : 'No preview'}
                  </div>
              }
              {isReplacingId === img.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-bg/75">
                  <span className="text-xs text-info animate-pulse uppercase">Replacing…</span>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-ink-muted truncate" title={img.id}>{img.id}</p>
              <div className="flex items-center gap-2 text-xs">
                <span className={STATUS_STYLE[img.status] ?? 'text-ink-muted'}>{img.status}</span>
                {coverId === img.id && <span className="text-accent-500">◆ cover</span>}
              </div>
            </div>
            <ImageCardActions
              id={img.id} coverId={coverId} disabled={disabled}
              isReplacing={isReplacingId === img.id}
              onInsert={onInsert} onSetCover={onSetCover}
              onStartReplace={startReplace} onDelete={id => wrap(() => onDelete(id))}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
