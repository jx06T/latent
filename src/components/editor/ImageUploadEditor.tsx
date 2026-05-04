import { useState, useRef, useEffect, useCallback, type DragEvent, type ChangeEvent } from 'react'
import { createClient } from '@supabase/supabase-js'

// ── 型別 ─────────────────────────────────────────────────────────────────────
interface UploadInfo {
  status: 'uploading' | 'done' | 'error'
  localUrl: string
  error?: string
}

interface Props {
  projectId: string
  initialMarkdown?: string
  /** R2 image-worker 的公開 base URL，用於草稿預覽 */
  workerUrl: string
  /** Supabase anon key（client-side） */
  supabaseUrl: string
  supabaseAnonKey: string
}

// ── Canvas 預縮圖（最長邊不超過 2000px，輸出 JPEG） ───────────────────────────
function resizeImage(file: File, maxPx = 2000): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objUrl)
      let { naturalWidth: w, naturalHeight: h } = img
      if (Math.max(w, h) > maxPx) {
        const scale = maxPx / Math.max(w, h)
        w = Math.round(w * scale)
        h = Math.round(h * scale)
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas not supported'))
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
        'image/jpeg',
        0.85,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(objUrl); reject(new Error('Image load failed')) }
    img.src = objUrl
  })
}

// ── 主元件 ────────────────────────────────────────────────────────────────────
export default function ImageUploadEditor({
  projectId,
  initialMarkdown = '',
  workerUrl,
  supabaseUrl,
  supabaseAnonKey,
}: Props) {
  const [markdown, setMarkdown]       = useState(initialMarkdown)
  const [uploads, setUploads]         = useState<Record<string, UploadInfo>>({})
  const [authToken, setAuthToken]     = useState<string | null>(null)
  const [publishMsg, setPublishMsg]   = useState<string>('')
  const [isDragging, setIsDragging]   = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const markdownRef = useRef(initialMarkdown) // 總是持有最新值，供上傳閉包使用

  // 同步 ref
  useEffect(() => { markdownRef.current = markdown }, [markdown])

  // ── 取得 Supabase session token ────────────────────────────────────────────
  useEffect(() => {
    const supa = createClient(supabaseUrl, supabaseAnonKey)
    supa.auth.getSession().then(({ data: { session } }) => {
      setAuthToken(session?.access_token ?? null)
    })
    const { data: { subscription } } = supa.auth.onAuthStateChange((_, session) => {
      setAuthToken(session?.access_token ?? null)
    })
    return () => subscription.unsubscribe()
  }, [supabaseUrl, supabaseAnonKey])

  // ── 在游標位置插入文字 ────────────────────────────────────────────────────
  const insertAtCursor = useCallback((text: string) => {
    const ta = textareaRef.current
    if (!ta) {
      setMarkdown(prev => { const v = prev + '\n' + text; markdownRef.current = v; return v })
      return
    }
    const start = ta.selectionStart
    const end   = ta.selectionEnd
    setMarkdown(prev => {
      const updated = prev.slice(0, start) + text + prev.slice(end)
      markdownRef.current = updated
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + text.length
        ta.focus()
      })
      return updated
    })
  }, [])

  // ── 核心上傳流程 ──────────────────────────────────────────────────────────
  const uploadImage = useCallback(async (file: File) => {
    if (!authToken) {
      alert('請先登入 Supabase 再上傳圖片')
      return
    }
    if (!file.type.startsWith('image/')) return

    const tempId   = `temp-${crypto.randomUUID()}`
    const localUrl = URL.createObjectURL(file)

    // 插入佔位符（Loading UI）
    insertAtCursor(`![](${tempId})`)
    setUploads(prev => ({ ...prev, [tempId]: { status: 'uploading', localUrl } }))

    try {
      // 1. Canvas 預縮圖
      const blob = await resizeImage(file)

      // 2. 取得 Presigned URL + Auto GC
      const res = await fetch('/api/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          project_id:      projectId,
          markdown_content: markdownRef.current,
          image_type:      'content',
          content_type:    blob.type,
          file_size:       blob.size,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(err.error ?? 'Upload URL request failed')
      }

      const { upload_url, image_id } = await res.json()

      // 3. 直傳 R2（Presigned PUT）
      const putRes = await fetch(upload_url, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': blob.type },
      })
      if (!putRes.ok) throw new Error(`R2 PUT failed: ${putRes.status}`)

      // 4. 替換佔位符 ID 為真實 image_id
      setMarkdown(prev => {
        const updated = prev.replaceAll(`(${tempId})`, `(${image_id})`)
        markdownRef.current = updated
        return updated
      })

      setUploads(prev => {
        const { [tempId]: _, ...rest } = prev
        return { ...rest, [image_id]: { status: 'done', localUrl } }
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setMarkdown(prev => {
        const updated = prev.replaceAll(`![](${tempId})`, `<!-- 上傳失敗: ${msg} -->`)
        markdownRef.current = updated
        return updated
      })
      setUploads(prev => ({ ...prev, [tempId]: { status: 'error', localUrl, error: msg } }))
    }
  }, [authToken, projectId, insertAtCursor])

  // ── 拖曳事件 ──────────────────────────────────────────────────────────────
  const handleDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = ()            => setIsDragging(false)
  const handleDrop = async (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    for (const f of files) await uploadImage(f)
  }

  // ── 點擊上傳 ──────────────────────────────────────────────────────────────
  const handleFileInput = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    for (const f of files) await uploadImage(f)
    e.target.value = '' // 允許重複選同檔
  }

  // ── 發布 ──────────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!authToken) { setPublishMsg('請先登入'); return }
    setPublishMsg('送出中...')
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ project_id: projectId }),
      })
      const data = await res.json()
      setPublishMsg(res.ok ? `✓ 背景處理中（project_id: ${projectId}）` : `✗ ${data.error}`)
    } catch (err: unknown) {
      setPublishMsg(`✗ ${err instanceof Error ? err.message : 'Network error'}`)
    }
  }

  // ── 構建草稿圖片的預覽 URL ────────────────────────────────────────────────
  const previewUrl = (id: string): string => {
    const info = uploads[id]
    if (info?.localUrl) return info.localUrl
    return `${workerUrl}/drafts/${projectId}/${id}.jpg`
  }

  const uploadList = Object.entries(uploads)

  return (
    <div className="space-y-4">
      {/* ── 認證狀態 ────────────────────────────────────────────────────── */}
      <div className="text-xs font-mono text-ink-muted border border-line px-3 py-1.5">
        {authToken ? (
          <span className="text-green-400">● session active</span>
        ) : (
          <span className="text-yellow-400">● no session · 請先登入 Supabase</span>
        )}
      </div>

      {/* ── 編輯區 + 拖曳 ───────────────────────────────────────────────── */}
      <div
        className={`relative border transition-colors ${
          isDragging ? 'border-accent-500 bg-accent-500/5' : 'border-line'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <textarea
          ref={textareaRef}
          value={markdown}
          onChange={e => {
            setMarkdown(e.target.value)
            markdownRef.current = e.target.value
          }}
          className="w-full min-h-[320px] bg-bg-surface text-ink font-mono text-sm p-4 resize-y outline-none"
          placeholder="在此輸入 Markdown 內容，或將圖片拖曳至此..."
          spellCheck={false}
        />
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg/80 pointer-events-none">
            <p className="font-mono text-accent-500 text-sm">放開以上傳圖片</p>
          </div>
        )}
      </div>

      {/* ── 工具列 ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <label className="cursor-pointer border border-line px-3 py-1.5 text-xs font-mono hover:border-accent-500 transition-colors">
          <span>+ 插入圖片</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
        </label>

        <button
          onClick={handlePublish}
          className="border border-accent-500 text-accent-500 px-3 py-1.5 text-xs font-mono hover:bg-accent-500/10 transition-colors"
        >
          PUBLISH →
        </button>

        {publishMsg && (
          <span className="text-xs font-mono text-ink-muted">{publishMsg}</span>
        )}
      </div>

      {/* ── 上傳狀態列表 ────────────────────────────────────────────────── */}
      {uploadList.length > 0 && (
        <div className="border border-line divide-y divide-line">
          <p className="px-3 py-1.5 text-[10px] font-mono uppercase text-ink-muted">Upload Queue</p>
          {uploadList.map(([id, info]) => (
            <div key={id} className="flex items-center gap-3 px-3 py-2">
              {info.localUrl && (
                <img src={previewUrl(id)} alt="" className="w-10 h-10 object-cover border border-line" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-mono text-ink-muted truncate">{id}</p>
                <p className={`text-xs font-mono ${
                  info.status === 'done'      ? 'text-green-400'
                  : info.status === 'error'   ? 'text-red-400'
                  : 'text-yellow-400 animate-pulse'
                }`}>
                  {info.status === 'uploading' ? '上傳中...' : info.status === 'done' ? '完成' : `錯誤: ${info.error}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Markdown 原始碼（Dev 用） ───────────────────────────────────── */}
      <details className="border border-line">
        <summary className="px-3 py-1.5 text-[10px] font-mono uppercase text-ink-muted cursor-pointer">
          Raw Markdown (dev)
        </summary>
        <pre className="p-3 text-[11px] font-mono text-ink-muted overflow-auto max-h-48 bg-bg-surface">
          {markdown || '(empty)'}
        </pre>
      </details>
    </div>
  )
}
