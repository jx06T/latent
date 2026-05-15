import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type DragEvent,
} from 'react'
import { createMarkedInstance } from '@/lib/markdown-renderer'
import morphdom from 'morphdom'

const markedInstance = createMarkedInstance()
import { Button } from '@/components/ui/Button'
import { resolveImageIdsToUrls } from '@/lib/markdown-image'
import TextareaAutosize from 'react-textarea-autosize'
import { cn } from '@/lib/utils'

export interface MarkdownEditorHandle {
  insertAtCursor: (text: string, opts?: { newLine?: boolean }) => void
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

interface CursorPos { top: number; left: number; height: number }

function getCaretCoords(ta: HTMLTextAreaElement): CursorPos {
  const mirror = document.createElement('div')
  const cs = window.getComputedStyle(ta)
  const taRect = ta.getBoundingClientRect()

  for (const p of [
    'font-family', 'font-size', 'font-weight', 'font-style', 'letter-spacing',
    'line-height', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
    'box-sizing', 'width', 'word-break', 'overflow-wrap', 'white-space',
  ]) mirror.style.setProperty(p, cs.getPropertyValue(p))

  Object.assign(mirror.style, {
    position: 'fixed', visibility: 'hidden',
    top: `${taRect.top}px`, left: `${taRect.left}px`,
    height: 'auto', overflow: 'hidden',
  })

  mirror.appendChild(document.createTextNode(ta.value.slice(0, ta.selectionStart)))
  const caret = document.createElement('span')
  caret.textContent = '​'
  mirror.appendChild(caret)
  document.body.appendChild(mirror)

  const caretRect = caret.getBoundingClientRect()
  document.body.removeChild(mirror)
  const parentRect = ta.parentElement!.getBoundingClientRect()

  return {
    top: caretRect.top - parentRect.top,
    left: caretRect.left - parentRect.left,
    height: caretRect.height,
  }
}

const MarkdownEditor = forwardRef<MarkdownEditorHandle, Props>(
  function MarkdownEditor({ content, onChange, disabled, onImageDrop, imageUrlMap }, ref) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const previewRef = useRef<HTMLDivElement>(null)
    const [viewLayout, setViewLayout] = useState<ViewLayout>('split')
    const [tabView, setTabView] = useState<TabView>('edit')
    const [isDragging, setIsDragging] = useState(false)
    const [isDropUploading, setIsDropUploading] = useState(false)
    const [cursorPos, setCursorPos] = useState<CursorPos | null>(null)

    const insertAtCursor = useCallback(
      (text: string, opts?: { newLine?: boolean }) => {
        const ta = textareaRef.current
        if (!ta) {
          onChange(content + '\n' + text)
          return
        }
        const start = ta.selectionStart

        if (opts?.newLine) {
          const lineEnd = content.indexOf('\n', start)
          let insertAt: number
          let toInsert: string
          if (lineEnd === -1) {
            insertAt = content.length
            toInsert = '\n' + text
          } else {
            insertAt = lineEnd + 1
            toInsert = text + '\n'
          }
          onChange(content.slice(0, insertAt) + toInsert + content.slice(insertAt))
          requestAnimationFrame(() => {
            ta.selectionStart = ta.selectionEnd = insertAt + toInsert.length
            ta.focus()
          })
          return
        }

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
    const handleTextareaBlur  = useCallback(() => {
      const ta = textareaRef.current
      if (ta) setCursorPos(getCaretCoords(ta))
    }, [])
    const handleTextareaFocus = useCallback(() => setCursorPos(null), [])

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
          insertAtCursor(`![](image-id-${imageId})`, { newLine: true })
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

    const previewHtml = markedInstance.parse(resolvedContent) as string

    useEffect(() => {
      if (!previewRef.current) return
      const temp = document.createElement('div')
      temp.innerHTML = previewHtml
      morphdom(previewRef.current, temp, { childrenOnly: true })
    }, [previewHtml, showPreview])

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
              {cursorPos && (
                <div
                  className="absolute w-px bg-accent-500 animate-cursor pointer-events-none z-20"
                  style={{ top: cursorPos.top, left: cursorPos.left, height: cursorPos.height }}
                />
              )}
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
              ref={previewRef}
              className={cn(
                'prose prose-sm prose-invert max-w-none p-4 bg-bg wrap-anywhere [&_pre]:wrap-normal',
                viewLayout === 'split' ? 'w-1/2' : 'w-full',
              )}
            />
          )}
        </div>
      </div>
    )
  },
)

export default MarkdownEditor
