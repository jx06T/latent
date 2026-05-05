import { useState, useRef, useCallback, type ChangeEvent } from 'react'
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth'
import { supabase } from '@/lib/supabase'

interface ImageRecord {
  id: string
  status: string
  source_ext: string | null
  published_ext: string | null
  available_sizes: string[] | null
  created_at: string | null
  localUrl?: string
  previewUrl?: string
}

type LogLevel = 'info' | 'success' | 'error'
interface LogLine { time: string; level: LogLevel; msg: string }

interface Props {
  projectId: string
}

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
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('Canvas not supported'))
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
        'image/jpeg', 0.85,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(objUrl); reject(new Error('Image load failed')) }
    img.src = objUrl
  })
}

const STATUS_COLOR: Record<string, string> = {
  draft: 'text-yellow-400',
  processing: 'text-blue-400 animate-pulse',
  published: 'text-green-400',
}

export default function PublishTestPanel({ projectId }: Props) {
  const { isLoggedIn, accessToken } = useSupabaseAuth()
  const [images, setImages] = useState<ImageRecord[]>([])
  const [logs, setLogs] = useState<LogLine[]>([])
  const [projectStatus, setProjectStatus] = useState<string>('—')
  const [loadingList, setLoadingList] = useState(false)
  const [replacingId, setReplacingId] = useState<string | null>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)

  const log = useCallback((msg: string, level: LogLevel = 'info') => {
    const time = new Date().toISOString().slice(11, 19)
    setLogs(prev => [...prev.slice(-49), { time, level, msg }])
  }, [])

  const loadImages = useCallback(async () => {
    setLoadingList(true)
    try {
      const [imgRes, projRes] = await Promise.all([
        supabase.from('project_images')
          .select('id, status, source_ext, published_ext, available_sizes, created_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: true }),
        supabase.from('projects').select('status').eq('id', projectId).single(),
      ])
      console.log(imgRes, projRes)

      if (imgRes.error || projRes.error) {
        console.error('🚨 [Supabase 查詢錯誤] 圖片查詢:', imgRes.error);
        console.error('🚨 [Supabase 查詢錯誤] 專案查詢:', projRes.error);

        const errorDetails = [
          imgRes.error ? `ImgErr: ${imgRes.error.message} (${imgRes.error.code})` : '',
          projRes.error ? `ProjErr: ${projRes.error.message} (${projRes.error.code})` : ''
        ].filter(Boolean).join(' | ');

        throw new Error(`資料庫查詢失敗: ${errorDetails}`);
      }

      setImages(imgRes.data?.map(r => ({ ...r })) ?? [])
      setProjectStatus(projRes.data?.status ?? '—')
      log(`已載入 ${imgRes.data?.length ?? 0} 張圖片，專案狀態: ${projRes.data?.status ?? '不明'}`, 'success')


    } catch (err) {
      log(`載入失敗: ${String(err)}`, 'error')
    }
    setLoadingList(false)
  }, [projectId, log])

  const handleUpload = useCallback(async (file: File) => {
    if (!accessToken) { log('請先登入', 'error'); return }
    log(`上傳: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`)
    const localUrl = URL.createObjectURL(file)
    try {
      const blob = await resizeImage(file)
      const res = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ project_id: projectId, content_type: blob.type, file_size: blob.size }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data.error as string) ?? `HTTP ${res.status}`)
      const { image_id, upload_url, preview_url } = data as { image_id: string; upload_url: string; preview_url: string }

      log(`presigned URL 取得 · image_id=${image_id.slice(0, 8)}...`)
      const putRes = await fetch(upload_url, { method: 'PUT', body: blob, headers: { 'Content-Type': blob.type } })
      if (!putRes.ok) throw new Error(`R2 PUT ${putRes.status}`)

      log(`上傳成功 · image_id=${image_id.slice(0, 8)}...`, 'success')
      setImages(prev => [...prev, {
        id: image_id,
        status: 'draft',
        source_ext: 'jpg',
        published_ext: null,
        available_sizes: null,
        created_at: new Date().toISOString(),
        localUrl,
        previewUrl: preview_url,
      }])
    } catch (err) {
      URL.revokeObjectURL(localUrl)
      log(`上傳失敗: ${err instanceof Error ? err.message : String(err)}`, 'error')
    }
  }, [accessToken, projectId, log])

  const handleReplace = useCallback(async (imageId: string, file: File) => {
    if (!accessToken) { log('請先登入', 'error'); return }
    log(`替換: image_id=${imageId.slice(0, 8)}...`)
    const localUrl = URL.createObjectURL(file)
    try {
      const blob = await resizeImage(file)
      const res = await fetch(`/api/images/${imageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ content_type: blob.type, file_size: blob.size }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data.error as string) ?? `HTTP ${res.status}`)
      const { upload_url, preview_url } = data as { upload_url: string; preview_url: string }

      const putRes = await fetch(upload_url, { method: 'PUT', body: blob, headers: { 'Content-Type': blob.type } })
      if (!putRes.ok) throw new Error(`R2 PUT ${putRes.status}`)

      log(`替換成功 · image_id=${imageId.slice(0, 8)}...`, 'success')
      setImages(prev => prev.map(img =>
        img.id === imageId ? { ...img, source_ext: 'jpg', localUrl, previewUrl: preview_url } : img
      ))
    } catch (err) {
      URL.revokeObjectURL(localUrl)
      log(`替換失敗: ${err instanceof Error ? err.message : String(err)}`, 'error')
    }
    setReplacingId(null)
  }, [accessToken, log])

  const handleDelete = useCallback(async (imageId: string) => {
    if (!accessToken) { log('請先登入', 'error'); return }
    log(`刪除: image_id=${imageId.slice(0, 8)}...`)
    try {
      const res = await fetch(`/api/images/${imageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data.error as string) ?? `HTTP ${res.status}`)
      log(`刪除成功 · image_id=${imageId.slice(0, 8)}...`, 'success')
      setImages(prev => prev.filter(img => img.id !== imageId))
    } catch (err) {
      log(`刪除失敗: ${err instanceof Error ? err.message : String(err)}`, 'error')
    }
  }, [accessToken, log])

  const handlePublish = useCallback(async () => {
    if (!accessToken) { log('請先登入', 'error'); return }
    log('送出發布請求 → POST /api/publish')
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ project_id: projectId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data.error as string) ?? `HTTP ${res.status}`)
      log('發布請求接受 (202) · 背景 Sharp 處理中', 'success')
      setProjectStatus('processing')
    } catch (err) {
      log(`發布失敗: ${err instanceof Error ? err.message : String(err)}`, 'error')
    }
  }, [accessToken, projectId, log])

  const onReplaceFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && replacingId) handleReplace(replacingId, file)
    e.target.value = ''
  }

  const triggerReplace = (imageId: string) => {
    setReplacingId(imageId)
    replaceInputRef.current?.click()
  }

  return (
    <div className="space-y-4 font-mono text-xs">
      <input ref={replaceInputRef} type="file" accept="image/*" className="hidden" onChange={onReplaceFileChange} />

      {/* ── 狀態列 ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border border-line px-3 py-2">
        <span className="text-ink-muted uppercase">AUTH</span>
        {isLoggedIn ? (
          <span className="text-green-400">● session active</span>
        ) : (
          <span className="text-yellow-400">● no session</span>
        )}
        <span className="text-line hidden sm:inline">|</span>
        <span className="text-ink-muted uppercase">PROJECT</span>
        <span className="text-ink-muted truncate max-w-[16rem]">{projectId}</span>
        <span className="text-line hidden sm:inline">|</span>
        <span className="text-ink-muted uppercase">STATUS</span>
        <span className={STATUS_COLOR[projectStatus] ?? 'text-ink-muted'}>{projectStatus}</span>
      </div>

      {/* ── 圖片列表 ──────────────────────────────────────────────────── */}
      <div className="border border-line">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-line">
          <span className="text-[10px] uppercase text-ink-muted">Image List · {images.length} 張</span>
          <button
            onClick={loadImages}
            disabled={loadingList}
            className="px-2 py-0.5 border border-line text-[10px] uppercase hover:border-accent-500 hover:text-accent-500 transition-colors disabled:opacity-40"
          >
            {loadingList ? 'LOADING...' : 'RELOAD_DB'}
          </button>
        </div>

        {images.length === 0 ? (
          <div className="px-3 py-4 text-ink-muted text-center text-[10px] uppercase">
            No images · upload one or click RELOAD_DB
          </div>
        ) : (
          <div className="divide-y divide-line">
            {images.map(img => (
              <div key={img.id} className="flex items-center gap-3 px-3 py-2">
                <div className="w-10 h-10 border border-line shrink-0 overflow-hidden bg-bg-surface">
                  {(img.localUrl ?? img.previewUrl) ? (
                    <img src={img.localUrl ?? img.previewUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[8px] text-ink-muted">N/A</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-ink truncate">{img.id}</p>
                  <p className="text-ink-muted text-[10px]">
                    {img.source_ext ?? '?'} ·{' '}
                    <span className={STATUS_COLOR[img.status] ?? 'text-ink-muted'}>{img.status}</span>
                    {img.available_sizes && <span> · {img.available_sizes.join(' ')}</span>}
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  {img.status === 'draft' && (
                    <button
                      onClick={() => triggerReplace(img.id)}
                      className="px-2 py-0.5 border border-line text-[10px] uppercase hover:border-accent-500 hover:text-accent-500 transition-colors"
                    >
                      REPLACE
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(img.id)}
                    className="px-2 py-0.5 border border-line text-[10px] uppercase hover:border-danger hover:text-danger transition-colors"
                  >
                    DELETE
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 上傳新圖片 + 發布 ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <label className="cursor-pointer border border-line px-3 py-1.5 text-[10px] uppercase hover:border-accent-500 hover:text-accent-500 transition-colors">
          + UPLOAD_IMAGE
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={async e => {
              const files = Array.from(e.target.files ?? [])
              for (const f of files) await handleUpload(f)
              e.target.value = ''
            }}
          />
        </label>

        <button
          onClick={handlePublish}
          className="border border-accent-500 text-accent-500 px-3 py-1.5 text-[10px] uppercase hover:bg-accent-500/10 transition-colors"
        >
          PUBLISH_PROJECT →
        </button>
      </div>

      {/* ── 操作日誌 ──────────────────────────────────────────────────── */}
      <div className="border border-line">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-line">
          <span className="text-[10px] uppercase text-ink-muted">Operation Log</span>
          <button onClick={() => setLogs([])} className="text-[10px] text-ink-muted hover:text-danger transition-colors uppercase">
            CLEAR
          </button>
        </div>
        <div className="max-h-40 overflow-y-auto p-2 space-y-0.5 bg-bg-surface">
          {logs.length === 0 ? (
            <p className="text-ink-muted text-[10px]">— 尚無操作記錄 —</p>
          ) : (
            logs.map((l, i) => (
              <p key={i} className={`text-[10px] ${l.level === 'success' ? 'text-green-400' : l.level === 'error' ? 'text-red-400' : 'text-ink-muted'}`}>
                <span className="text-ink-dim mr-2">{l.time}</span>{l.msg}
              </p>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
