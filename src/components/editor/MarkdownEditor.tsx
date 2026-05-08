import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useCallback,
  useMemo,
  type DragEvent,
} from 'react'
import { marked } from 'marked'
import { Button } from '@/components/ui/Button'
import { resolveImageIdsToUrls } from '@/lib/markdown-image'
import TextareaAutosize from 'react-textarea-autosize'
import { cn } from '@/lib/utils'

export interface MarkdownEditorHandle {
  insertAtCursor: (text: string) => void
}

interface Props {
  content: string
  onChange: (content: string) => void
  disabled?: boolean
  onImageDrop?: (file: File) => Promise<string>
  imageUrlMap?: Record<string, string>
}

type ViewLayout = 'split' | 'tab'
type TabView = 'edit' | 'preview'

interface CursorHint {
  line: number
  preview: string
}

const MarkdownEditor = forwardRef<MarkdownEditorHandle, Props>(
  function MarkdownEditor({ content, onChange, disabled, onImageDrop, imageUrlMap }, ref) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const [viewLayout, setViewLayout] = useState<ViewLayout>('split')
    const [tabView, setTabView] = useState<TabView>('edit')
    const [isDragging, setIsDragging] = useState(false)
    const [isDropUploading, setIsDropUploading] = useState(false)
    const [cursorHint, setCursorHint] = useState<CursorHint | null>(null)

    const insertAtCursor = useCallback(
      (text: string) => {
        const ta = textareaRef.current
        if (!ta) {
          onChange(content + '\n' + text)
          return
        }
        const start = ta.selectionStart
        const end = ta.selectionEnd
        const updated = content.slice(0, start) + text + content.slice(end)
        onChange(updated)
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + text.length
          ta.focus()
        })
      },
      [content, onChange],
    )

    useImperativeHandle(ref, () => ({ insertAtCursor }), [insertAtCursor])

    // ── Cursor insert hint ────────────────────────────────────────────────
    const handleTextareaBlur = useCallback(() => {
      const ta = textareaRef.current
      if (!ta) return
      const pos = ta.selectionStart
      const before = ta.value.slice(0, pos)
      const lines = before.split('\n')
      const lineNum = lines.length
      const currentLine = ta.value.split('\n')[lineNum - 1] ?? ''
      setCursorHint({
        line: lineNum,
        preview: currentLine.trim().slice(0, 24),
      })
    }, [])

    const handleTextareaFocus = useCallback(() => {
      setCursorHint(null)
    }, [])

    // ── Drag-drop image upload ────────────────────────────────────────────
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      if (onImageDrop) setIsDragging(true)
    }
    const handleDragLeave = () => setIsDragging(false)
    const handleDrop = async (e: DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (!onImageDrop) return
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
      if (!files.length) return
      setIsDropUploading(true)
      for (const file of files) {
        try {
          const imageId = await onImageDrop(file)
          insertAtCursor(`![](image-id-${imageId})`)
        } catch { /* ignore individual failures */ }
      }
      setIsDropUploading(false)
    }

    const showEditor = viewLayout === 'split' || tabView === 'edit'
    const showPreview = viewLayout === 'split' || tabView === 'preview'
    const resolvedContent = useMemo(() => {
      if (!imageUrlMap || Object.keys(imageUrlMap).length === 0) return content
      return resolveImageIdsToUrls(content, imageUrlMap)
    }, [content, imageUrlMap])
    const previewHtml = marked.parse(resolvedContent) as string

    return (
      <div className="flex flex-col font-mono">
        {/* ── Toolbar ── */}
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-line bg-bg-surface">
          <Button
            variant={viewLayout === 'split' ? 'secondary' : 'ghost'}
            className="text-xs px-2 py-0.5"
            onClick={() => setViewLayout('split')}
          >
            Split
          </Button>
          <Button
            variant={viewLayout === 'tab' ? 'secondary' : 'ghost'}
            className="text-xs px-2 py-0.5"
            onClick={() => setViewLayout('tab')}
          >
            Tab
          </Button>
          {viewLayout === 'tab' && (
            <>
              <span className="w-px h-3 bg-line mx-1" />
              <Button
                variant={tabView === 'edit' ? 'secondary' : 'ghost'}
                className="text-[9px] px-2 py-0.5"
                onClick={() => setTabView('edit')}
              >
                Edit
              </Button>
              <Button
                variant={tabView === 'preview' ? 'secondary' : 'ghost'}
                className="text-[9px] px-2 py-0.5"
                onClick={() => setTabView('preview')}
              >
                Preview
              </Button>
            </>
          )}
          {isDropUploading && (
            <span className="ml-2 text-[9px] text-info animate-pulse">Uploading…</span>
          )}

          {/* Cursor insert hint — shown when textarea loses focus */}
          {cursorHint && (
            <span
              className="ml-auto flex items-center gap-1 text-[9px] text-accent-500 border border-accent-500/40 px-1.5 py-0.5 shrink-0"
              title={`Insert position: line ${cursorHint.line}${cursorHint.preview ? ` — "${cursorHint.preview}"` : ''}`}
            >
              <span>↵</span>
              <span>L{cursorHint.line}</span>
              {cursorHint.preview && (
                <span className="text-ink-dim hidden sm:inline">
                  {cursorHint.preview.length > 16
                    ? cursorHint.preview.slice(0, 16) + '…'
                    : cursorHint.preview || '(empty line)'}
                </span>
              )}
            </span>
          )}
        </div>

        {/* ── Edit / Preview panes ── */}
        <div
          className={cn('flex min-h-100', isDragging && 'ring-1 ring-accent-500')}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Editor pane */}
          {showEditor && (
            <div className={cn(
              'relative flex flex-col',
              viewLayout === 'split' ? 'w-1/2 border-r border-line' : 'w-full',
            )}>
              <TextareaAutosize
                ref={textareaRef}
                value={content}
                onChange={e => onChange(e.target.value)}
                onBlur={handleTextareaBlur}
                onFocus={handleTextareaFocus}
                disabled={disabled}
                spellCheck={false}
                className="w-full bg-bg-surface text-ink text-xs p-3 resize-none outline-none font-mono leading-relaxed disabled:opacity-50 overflow-hidden caret-accent-500"
                placeholder={onImageDrop ? 'Markdown content… drag images here or use sidebar' : 'Markdown content…'}
              />
              {isDragging && (
                <div className="absolute inset-0 flex items-center justify-center bg-bg/70 pointer-events-none">
                  <span className="text-accent-500 text-xs">Drop image to upload</span>
                </div>
              )}
            </div>
          )}

          {/* Preview pane */}
          {showPreview && (
            <div
              className={cn(
                'prose prose-sm max-w-none p-4 bg-bg',
                viewLayout === 'split' ? 'w-1/2' : 'w-full',
              )}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          )}
        </div>
      </div>
    )
  },
)

export default MarkdownEditor
