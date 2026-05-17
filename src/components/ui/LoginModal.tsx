/**
 * Global login modal — one instance per page, mounted in Layout.astro.
 *
 * Shows when any component dispatches:
 *   document.dispatchEvent(new CustomEvent('latent:show-login-modal'))
 *
 * Auth is handled by <GISButton>, which also fires One Tap simultaneously.
 */
import { useState, useEffect, useCallback } from 'react'
import { isInAppBrowser } from '@/lib/browser-detection'
import GISButton from '@/components/ui/GISButton'

export default function LoginModal() {
  const [visible, setVisible] = useState(false)
  const [isRedirectMode, setIsRedirectMode] = useState(false)

  const close = useCallback(() => setVisible(false), [])

  useEffect(() => {
    const handler = () => {
      setIsRedirectMode(isInAppBrowser())
      setVisible(true)
    }
    document.addEventListener('latent:show-login-modal', handler)
    return () => document.removeEventListener('latent:show-login-modal', handler)
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Google 登入"
        className="w-full max-w-sm border border-line bg-bg-elevated font-mono p-6 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-widest text-ink-muted">登入</p>
          <p className="text-sm text-ink">使用 Google 帳號繼續</p>
          {isRedirectMode && (
            <p className="text-xs text-ink-muted mt-1">
              點擊後將跳轉至 Google 登入頁面，完成後自動返回。
            </p>
          )}
        </div>

        <GISButton onSuccess={close} oneTap={!isRedirectMode} />

        <button
          onClick={close}
          className="w-full text-xs text-ink-muted hover:text-ink transition-colors py-1"
        >
          取消
        </button>
      </div>
    </div>
  )
}
