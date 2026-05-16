import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react'
import { createMarkedInstance } from '@/lib/markdown-renderer'
import { Idiomorph } from 'idiomorph'
import { EditorView, keymap, placeholder as cmPlaceholder } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { history, defaultKeymap, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { HighlightStyle, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { tags } from '@lezer/highlight'
import { Button } from '@/components/ui/Button'
import { resolveImageIdsToUrls } from '@/lib/markdown-image'
import { cn } from '@/lib/utils'

const markedInstance = createMarkedInstance()

const markdownHighlight = HighlightStyle.define([
  { tag: tags.punctuation, color: '#749cba' },           // generic punctuation → ink-dim
  { tag: tags.processingInstruction, color: '#749cba' }, // **, *, _ emphasis marks → ink-dim
  { tag: tags.url, color: '#e37c46' },                  // URLs/link href → accent
  { tag: tags.strong, fontWeight: 'bold' },              // bold text (explicit, don't depend on fallback)
  { tag: tags.emphasis, fontStyle: 'italic' },           // italic text (same reason)
  { tag: tags.typeName, color: '#b8cfd9' },              // code fence language annotation
])

function wrapWithMarker(view: EditorView, marker: string): boolean {
  const { from, to, empty } = view.state.selection.main
  const len = marker.length
  if (empty) {
    view.dispatch({
      changes: { from, insert: marker.repeat(2) },
      selection: { anchor: from + len },
    })
  } else {
    const text = view.state.doc.sliceString(from, to)
    if (text.startsWith(marker) && text.endsWith(marker) && text.length > len * 2) {
      view.dispatch({
        changes: { from, to, insert: text.slice(len, -len) },
        selection: { anchor: from, head: to - len * 2 },
      })
    } else {
      view.dispatch({
        changes: { from, to, insert: `${marker}${text}${marker}` },
        selection: { anchor: from, head: to + len * 2 },
      })
    }
  }
  return true
}

const markdownKeymap = [
  { key: 'Mod-b', run: (view: EditorView) => wrapWithMarker(view, '**') },
  { key: 'Mod-i', run: (view: EditorView) => wrapWithMarker(view, '*') },
]

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

const editorTheme = EditorView.theme({
  '&': { backgroundColor: '#1c1c1c', color: '#f0f4f5' },
  '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', overflow: 'auto' },
  '.cm-content': {
    fontSize: '0.75rem',
    lineHeight: '1.625',
    padding: '0.75rem',
    caretColor: '#e37c46',
    minHeight: '25rem',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-cursor': { borderLeftColor: '#e37c46' },
  '.cm-selectionBackground': { backgroundColor: '#284260 !important' },
  '&.cm-focused .cm-selectionBackground': { backgroundColor: '#284260 !important' },
  '.cm-gutters': { display: 'none' },
  '.cm-activeLine': { backgroundColor: 'transparent' },
  '.cm-placeholder': { color: '#749cba', fontStyle: 'normal' },
}, { dark: true })

const MarkdownEditor = forwardRef<MarkdownEditorHandle, Props>(
  function MarkdownEditor({ content, onChange, disabled, onImageDrop, imageUrlMap }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const editorPaneRef = useRef<HTMLDivElement>(null)
    const viewRef = useRef<EditorView | null>(null)
    const lastOnChangeRef = useRef(content)
    const onChangeRef = useRef(onChange)
    const onImageDropRef = useRef(onImageDrop)
    const previewRef = useRef<HTMLDivElement>(null)
    const editableCompartment = useRef(new Compartment()).current

    const [viewLayout, setViewLayout] = useState<ViewLayout>('split')
    const [tabView, setTabView] = useState<TabView>('edit')
    const [isDragging, setIsDragging] = useState(false)
    const [isDropUploading, setIsDropUploading] = useState(false)
    const [blurCursor, setBlurCursor] = useState<{ top: number; left: number; height: number } | null>(null)

    useEffect(() => { onChangeRef.current = onChange }, [onChange])
    useEffect(() => { onImageDropRef.current = onImageDrop }, [onImageDrop])

    // ── Setup CodeMirror ─────────────────────────────────────────────────
    useEffect(() => {
      if (!containerRef.current) return

      const view = new EditorView({
        state: EditorState.create({
          doc: content,
          extensions: [
            history(),
            markdown(),
            EditorView.lineWrapping,
            syntaxHighlighting(markdownHighlight),
            syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
            keymap.of([...markdownKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
            cmPlaceholder('Markdown content… drag images here or use sidebar'),
            editorTheme,
            editableCompartment.of(EditorView.editable.of(!disabled)),
            EditorView.updateListener.of(update => {
              if (!update.docChanged) return
              const next = update.state.doc.toString()
              lastOnChangeRef.current = next
              onChangeRef.current(next)
            }),
            EditorView.domEventHandlers({
              focus() {
                setBlurCursor(null)
              },
              blur() {
                const v = viewRef.current
                const pane = editorPaneRef.current
                if (!v || !pane) return
                const coords = v.coordsAtPos(v.state.selection.main.head)
                if (!coords) return
                const rect = pane.getBoundingClientRect()
                setBlurCursor({
                  top: coords.top - rect.top,
                  left: coords.left - rect.left,
                  height: coords.bottom - coords.top,
                })
              },
              dragover(e) {
                e.preventDefault()
                if (onImageDropRef.current) setIsDragging(true)
                return true
              },
              dragleave() {
                setIsDragging(false)
              },
              drop(e) {
                e.preventDefault()
                setIsDragging(false)
                const handler = onImageDropRef.current
                if (!handler) return
                const files = Array.from(e.dataTransfer?.files ?? []).filter(f => f.type.startsWith('image/'))
                if (!files.length) return
                setIsDropUploading(true);
                (async () => {
                  for (const file of files) {
                    try {
                      const imageId = await handler(file)
                      const v = viewRef.current
                      if (v) {
                        const { from } = v.state.selection.main
                        const line = v.state.doc.lineAt(from)
                        const toInsert = '\n' + `![](image-id-${imageId})`
                        v.dispatch({
                          changes: { from: line.to, insert: toInsert },
                          selection: { anchor: line.to + toInsert.length },
                        })
                      }
                    } catch { /* ignore individual failures */ }
                  }
                  setIsDropUploading(false)
                })()
              },
            }),
          ],
        }),
        parent: containerRef.current,
      })

      viewRef.current = view
      return () => { view.destroy(); viewRef.current = null }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // ── Sync content when changed externally (e.g. project load) ────────
    useEffect(() => {
      const view = viewRef.current
      if (!view || content === lastOnChangeRef.current) return
      const current = view.state.doc.toString()
      if (current !== content) {
        view.dispatch({ changes: { from: 0, to: current.length, insert: content } })
        lastOnChangeRef.current = content
      }
    }, [content])

    // ── Sync disabled state ──────────────────────────────────────────────
    useEffect(() => {
      viewRef.current?.dispatch({
        effects: editableCompartment.reconfigure(EditorView.editable.of(!disabled)),
      })
    }, [disabled, editableCompartment])

    // ── insertAtCursor ───────────────────────────────────────────────────
    const insertAtCursor = useCallback((text: string, opts?: { newLine?: boolean }) => {
      const view = viewRef.current
      if (!view) return

      if (opts?.newLine) {
        const { from } = view.state.selection.main
        const line = view.state.doc.lineAt(from)
        const toInsert = '\n' + text
        view.dispatch({
          changes: { from: line.to, insert: toInsert },
          selection: { anchor: line.to + toInsert.length },
        })
        view.focus()
        return
      }

      view.dispatch(view.state.replaceSelection(text))
      view.focus()
    }, [])

    useImperativeHandle(ref, () => ({ insertAtCursor }), [insertAtCursor])

    // ── Preview ──────────────────────────────────────────────────────────
    const showEditor = viewLayout === 'split' || tabView === 'edit'
    const showPreview = viewLayout === 'split' || tabView === 'preview'

    const resolvedContent = useMemo(() => {
      if (!imageUrlMap || Object.keys(imageUrlMap).length === 0) return content
      return resolveImageIdsToUrls(content, imageUrlMap)
    }, [content, imageUrlMap])

    const previewHtml = useMemo(
      () => markedInstance.parse(resolvedContent) as string,
      [resolvedContent],
    )

    useEffect(() => {
      if (!previewRef.current || !showPreview) return

      // Snapshot existing img DOM nodes by id before morphing
      const imgSnapshot = new Map<string, HTMLImageElement>()
      previewRef.current.querySelectorAll<HTMLImageElement>('img[id]').forEach(img => {
        imgSnapshot.set(img.id, img)
      })

      const temp = document.createElement('div')
      temp.innerHTML = previewHtml

      Idiomorph.morph(previewRef.current, temp, {
        morphStyle: 'innerHTML',
        callbacks: {
          // Block src re-assignment on img nodes — even setting the same value triggers
          // a reload after reparenting in some browsers
          beforeAttributeUpdated: (attributeName, el) => {
            if (el instanceof Element && el.tagName === 'IMG' && attributeName === 'src') {
              return false
            }
            return true
          },
        },
      })

      // Restore pre-morph img nodes in the same JS tick (before browser paint).
      // If idiomorph created a fresh <img> element (e.g. cross-parent move fell back to
      // recreation), swap it back with the already-loaded cached node to suppress flicker.
      previewRef.current.querySelectorAll<HTMLImageElement>('img[id]').forEach(img => {
        const cached = imgSnapshot.get(img.id)
        if (cached && cached !== img) {
          img.parentNode?.replaceChild(cached, img)
        }
      })
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
        <div className={cn('flex min-h-100', isDragging && 'ring-1 ring-accent-500')}>

          {/* Editor pane — always mounted to keep CodeMirror state alive */}
          <div
            ref={editorPaneRef}
            className={cn(
              'relative',
              viewLayout === 'split' ? 'w-1/2 border-r border-line' : 'w-full',
              !showEditor && 'hidden',
            )}
          >
            <div ref={containerRef} className="h-full" />
            {blurCursor && (
              <div
                className="absolute w-px bg-primary-500 pointer-events-none animate-cursor"
                style={{ top: blurCursor.top, left: blurCursor.left, height: blurCursor.height }}
              />
            )}
            {isDragging && (
              <div className="absolute inset-0 flex items-center justify-center bg-bg/70 pointer-events-none">
                <span className="text-accent-500 text-xs">Drop image to upload</span>
              </div>
            )}
          </div>

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
