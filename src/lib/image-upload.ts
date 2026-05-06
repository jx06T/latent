export function resizeImage(file: File, maxPx = 2000): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objUrl)
      let { naturalWidth: w, naturalHeight: h } = img
      if (Math.max(w, h) > maxPx) {
        const s = maxPx / Math.max(w, h)
        w = Math.round(w * s)
        h = Math.round(h * s)
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('canvas context unavailable'))
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        b => (b ? resolve(b) : reject(new Error('toBlob failed'))),
        'image/jpeg',
        0.85,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(objUrl); reject(new Error('image load failed')) }
    img.src = objUrl
  })
}

export async function uploadToR2(
  file: File,
  projectId: string,
  accessToken: string,
): Promise<{ image_id: string; preview_url: string }> {
  const blob = await resizeImage(file)
  const res = await fetch('/api/images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ project_id: projectId, content_type: blob.type, file_size: blob.size }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error((data.error as string) ?? `HTTP ${res.status}`)
  const { image_id, upload_url, preview_url } = data as {
    image_id: string; upload_url: string; preview_url: string
  }
  const put = await fetch(upload_url, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': blob.type },
  })
  if (!put.ok) throw new Error(`R2 PUT failed: ${put.status}`)
  return { image_id, preview_url }
}
