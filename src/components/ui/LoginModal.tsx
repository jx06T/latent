/**
 * Global login modal — one instance per page, mounted in Layout.astro.
 *
 * Shows when any component dispatches:
 *   document.dispatchEvent(new CustomEvent('latent:show-login-modal'))
 *
 * Renders the official GIS button (popup or redirect mode, auto-detected).
 * After successful auth, redirects only if the saved return URL differs
 * from the current path; otherwise React's onAuthStateChange handles the update.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { isInAppBrowser } from '@/lib/browser-detection'
import { initGIS, renderGISButton, promptOneTap, isGISReady } from '@/lib/gis'
import { consumePendingReturnUrl } from '@/lib/pending-action'

export default function LoginModal() {
  const [visible, setVisible] = useState(false)
  const [isRedirectMode, setIsRedirectMode] = useState(false)
  const btnRef = useRef<HTMLDivElement>(null)
  // Track mount attempts so we retry if GIS script hasn't loaded yet.
  const retryRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const close = useCallback(() => {
    setVisible(false)
    if (retryRef.current) {
      clearInterval(retryRef.current)
      retryRef.current = null
    }
  }, [])

  // Listen for the global show-login event.
  useEffect(() => {
    const handler = () => {
      setIsRedirectMode(isInAppBrowser())
      setVisible(true)
    }
    document.addEventListener('latent:show-login-modal', handler)
    return () => document.removeEventListener('latent:show-login-modal', handler)
  }, [])

  // Render GIS button once the modal is visible and the SDK is ready.
  useEffect(() => {
    if (!visible || !btnRef.current) return

    const credentialHandler = async (idToken: string) => {
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      })
      close()
      if (!error) {
        const returnUrl = consumePendingReturnUrl()
        if (returnUrl !== window.location.pathname) {
          window.location.replace(returnUrl)
        }
        // Same page: Supabase onAuthStateChange fires → React re-renders automatically.
      }
    }

    const mount = () => {
      if (!isGISReady() || !btnRef.current) return false
      initGIS(credentialHandler)
      renderGISButton(btnRef.current, btnRef.current.offsetWidth || 280)
      // Also fire One Tap so both UI surfaces appear simultaneously.
      // On in-app browsers One Tap is suppressed by the browser itself; the
      // modal button (redirect mode) remains the sole CTA in that case.
      if (!isRedirectMode) promptOneTap(() => { /* One Tap unavailable — modal button suffices */ })
      return true
    }

    if (!mount()) {
      // GIS script still loading — poll until ready (max ~3 s).
      retryRef.current = setInterval(() => {
        if (mount() && retryRef.current) {
          clearInterval(retryRef.current)
          retryRef.current = null
        }
      }, 100)
    }

    return () => {
      if (retryRef.current) {
        clearInterval(retryRef.current)
        retryRef.current = null
      }
    }
  }, [visible, close])

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

        {/* GIS renders its own button here */}
        <div ref={btnRef} className="flex justify-center min-h-11" />

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
