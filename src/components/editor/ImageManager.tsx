import { useState, useRef, type ChangeEvent, type DragEvent } from 'react'
import { Button } from '@/components/ui/Button'

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

const STATUS_COLOR: Record<string, string> = {
  draft: 'text-warning',
  processing: 'text-info animate-pulse',
  published: 'text-success',
}

interface Props {
  images: ImageRecord[]
  coverId: string | null
  disabled: boolean
  onUpload: (file: File) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onReplace: (id: string, file: File) => Promise<void>
  onInsert: (id: string) => void
  onSetCover: (id: string | null) => void
  showHeader?: boolean // New prop to control header visibility
}

export default function ImageManager({
  images,
  coverId,
  disabled,
  onUpload,
  onDelete,
  onReplace,
  onInsert,
  onSetCover,
  showHeader = true,
}: Props) {
  const [replacingId, setReplacingId] = useState<string | null>(null)
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
    if (file && replacingId) await wrap(() => onReplace(replacingId, file))
    e.target.value = ''
    setReplacingId(null)
  }

  const handleUploadFiles = async (files: File[]) => {
    setIsUploading(true)
    for (const f of files) await wrap(() => onUpload(f))
    setIsUploading(false)
  }

  // ── Drag-drop ─────────────────────────────────────────────────
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (disabled || isUploading) return
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

  return (
    <div className="flex flex-col h-full font-mono text-xs">
      <input ref={replaceInputRef} type="file" accept="image/*" className="hidden" onChange={onReplaceFileChange} />

      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-line shrink-0">
          <span className="text-sm uppercase text-ink-muted tracking-wider">
            Images · {images.length}
          </span>
          <label className={`cursor-pointer text-sm text-ink-muted hover:text-accent-500 transition-colors uppercase ${disabled || isUploading ? 'opacity-40 pointer-events-none' : ''}`}>
            {isUploading ? 'Uploading…' : '+ Upload'}
            <input
              type="file" accept="image/*" multiple className="hidden"
              disabled={disabled}
              onChange={e => { handleUploadFiles(Array.from(e.target.files ?? [])); e.target.value = '' }}
            />
          </label>
        </div>
      )}

      {/* Error strip */}
      {error && (
        <div className="px-3 py-1.5 text-xs text-danger bg-danger-ghost border-b border-danger/20 shrink-0">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-ink-ddim hover:text-ink">×</button>
        </div>
      )}

      {/* Horizontal scrollable image list */}
      <div
        className="flex-1 overflow-x-auto overflow-y-hidden"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className={`flex gap-3 p-3 min-h-full ${isDraggingOver ? 'bg-accent-500/10 border-2 border-dashed border-accent-500' : ''}`}>
          {images.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3 min-w-50">
              <div className="text-2xl opacity-20">🖼️</div>
              <div className="space-y-1">
                <p className="text-sm text-ink-muted uppercase tracking-wider">
                  {isUploading ? 'Uploading…' : 'No Images Yet'}
                </p>
                <p className="text-xs text-ink-ddim">
                  {isUploading ? 'Please wait' : 'Drag & drop or click Upload to add images'}
                </p>
              </div>
            </div>
          )}

          {images.map(img => (
            <div key={img.id} className="shrink-0 w-32 space-y-2">
              {/* Thumbnail */}
              <div className="w-full aspect-video bg-bg-elevated border border-line overflow-hidden rounded">
                {img.previewUrl ? (
                  <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-ink-ddim uppercase">
                    {img.status === 'published' ? 'CDN' : 'No preview'}
                  </div>
                )}
              </div>

              {/* Status & cover indicator */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-xs">
                  <span className={STATUS_COLOR[img.status] ?? 'text-ink-muted'}>{img.status}</span>
                  {coverId === img.id && <span className="text-accent-500">◆</span>}
                </div>
              </div>

              {/* Action buttons - compact */}
              <div className="flex flex-col gap-1">
                <Button
                  variant="outline" className="text-xs px-1 py-0.5 text-[10px]"
                  onClick={() => onInsert(img.id)}
                  disabled={disabled}
                  title="Insert into markdown"
                >
                  Insert
                </Button>

                <div className="flex gap-1">
                  <Button
                    variant={coverId === img.id ? 'secondary' : 'ghost'}
                    className="text-xs px-1 py-0.5 text-[10px] flex-1"
                    onClick={() => onSetCover(coverId === img.id ? null : img.id)}
                    disabled={disabled}
                  >
                    {coverId === img.id ? 'Uncover' : 'Cover'}
                  </Button>

                  <Button
                    variant="danger" className="text-xs px-1 py-0.5 text-[10px]"
                    disabled={disabled}
                    onClick={() => wrap(() => onDelete(img.id))}
                    title="Delete"
                  >
                    Del
                  </Button>
                </div>

                <Button
                  variant="outline" className="text-xs px-1 py-0.5 text-[10px]"
                  disabled={disabled}
                  title="Replace image"
                  onClick={() => { setReplacingId(img.id); replaceInputRef.current?.click() }}
                >
                  Replace
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}