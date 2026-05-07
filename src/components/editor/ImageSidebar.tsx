import { useState, useRef, type ChangeEvent } from 'react'
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
}

export default function ImageSidebar({
  images,
  coverId,
  disabled,
  onUpload,
  onDelete,
  onReplace,
  onInsert,
  onSetCover,
}: Props) {
  const [replacingId, setReplacingId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
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

  return (
    <div className="flex flex-col h-full font-mono text-base overflow-hidden">
      <input ref={replaceInputRef} type="file" accept="image/*" className="hidden" onChange={onReplaceFileChange} />

      {/* Header */}
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

      {/* Error strip */}
      {error && (
        <div className="px-3 py-1 text-[10px] text-danger bg-danger-ghost border-b border-danger/20 shrink-0">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-ink-disabled hover:text-ink">×</button>
        </div>
      )}

      {/* Image list */}
      <div className="flex-1 overflow-y-auto divide-y divide-line">
        {images.length === 0 && (
          <p className="px-3 py-6 text-center text-[10px] text-ink-disabled uppercase">
            No images · upload one
          </p>
        )}

        {images.map(img => (
          <div key={img.id} className="p-2.5 space-y-2">
            {/* Thumbnail */}
            <div className="w-full aspect-video bg-bg-elevated border border-line overflow-hidden">
              {img.previewUrl ? (
                <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[8px] text-ink-disabled uppercase">
                  {img.status === 'published' ? 'CDN' : 'No preview'}
                </div>
              )}
            </div>

            {/* ID */}
            <div>
              <p className="text-xs text-ink-muted truncate" title={img.id}>{img.id}</p>
              <div className="flex items-center gap-2 text-xs">
                <span className={STATUS_COLOR[img.status] ?? 'text-ink-muted'}>{img.status}</span>
                {coverId === img.id && <span className="text-accent-500"><span className=' text-[9px] inline-block mr-0.5'>◆</span>cover</span>}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-1">
              <Button
                variant="outline" className="text-xs px-1.5 py-0.5"
                onClick={() => onInsert(img.id)}
                disabled={disabled}
                title="Insert image reference into markdown"
              >
                Insert
              </Button>

              <Button
                variant={coverId === img.id ? 'secondary' : 'ghost'}
                className="text-xs px-1.5 py-0.5"
                onClick={() => onSetCover(coverId === img.id ? null : img.id)}
                disabled={disabled}
              >
                {coverId === img.id ? 'Uncover' : 'Cover'}
              </Button>

              <Button
                variant="outline" className="text-xs px-1.5 py-0.5"
                disabled={disabled}
                title="Upload new image (new ID → update markdown refs → delete old)"
                onClick={() => { setReplacingId(img.id); replaceInputRef.current?.click() }}
              >
                Replace
              </Button>

              <Button
                variant="danger" className="text-xs px-1.5 py-0.5"
                disabled={disabled}
                onClick={() => wrap(() => onDelete(img.id))}
              >
                Del
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
