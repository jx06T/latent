/**
 * Shared GIS sign-in button.
 * Encapsulates: GIS init, button render, retry-until-ready, signInWithIdToken, redirect.
 * Falls back to a plain button that opens LoginModal if GIS fails to render within 3 s.
 *
 * Props:
 *   onSuccess — called after successful auth, before any redirect (e.g. close a modal)
 *   oneTap    — also fire the One Tap prompt alongside the button (LoginModal use case)
 */
import { useRef, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { initGIS, renderGISButton, promptOneTap, isGISReady } from '@/lib/gis'
import { consumePendingReturnUrl } from '@/lib/pending-action'
import { cn } from '@/lib/utils'

interface Props {
  onSuccess?: () => void
  oneTap?: boolean
  className?: string
}

export default function GISButton({ onSuccess, oneTap = false, className }: Props) {
  const btnRef = useRef<HTMLDivElement>(null)
  const retryRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Keep latest callback in a ref so the effect closure stays stable.
  const onSuccessRef = useRef(onSuccess)
  useEffect(() => { onSuccessRef.current = onSuccess })

  const [showFallback, setShowFallback] = useState(false)

  useEffect(() => {
    const credentialHandler = async (idToken: string) => {
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      })
      if (!error) {
        onSuccessRef.current?.()
        const returnUrl = consumePendingReturnUrl()
        if (returnUrl !== window.location.pathname) {
          window.location.replace(returnUrl)
        }
        // Same page: onAuthStateChange fires → React re-renders automatically.
      }
    }

    let gisRendered = false
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null

    const mount = () => {
      if (!isGISReady() || !btnRef.current) return false
      initGIS(credentialHandler)
      renderGISButton(btnRef.current, btnRef.current.offsetWidth || 280)
      if (oneTap) promptOneTap(() => { /* suppressed — button is already visible */ })
      gisRendered = true
      return true
    }

    if (!mount()) {
      retryRef.current = setInterval(() => {
        if (mount() && retryRef.current) {
          clearInterval(retryRef.current)
          retryRef.current = null
          if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null }
        }
      }, 100)
      // If GIS hasn't loaded within 3 s (script blocked, wrong origin, missing CLIENT_ID),
      // surface a plain button that opens the modal as a last resort.
      fallbackTimer = setTimeout(() => {
        if (retryRef.current) {
          clearInterval(retryRef.current)
          retryRef.current = null
        }
        if (!gisRendered) setShowFallback(true)
      }, 3000)
    }

    return () => {
      if (retryRef.current) {
        clearInterval(retryRef.current)
        retryRef.current = null
      }
      if (fallbackTimer) clearTimeout(fallbackTimer)
    }
  }, [oneTap]) // eslint-disable-line react-hooks/exhaustive-deps

  if (showFallback) {
    return (
      <button
        onClick={() => supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(window.location.pathname)}`,
          },
        })}
        className={cn(
          'flex justify-center items-center min-h-11 w-full border border-line',
          'text-sm text-ink hover:border-accent-500/70 hover:text-accent-400 transition-colors px-4',
          className,
        )}
      >
        使用 Google 帳號繼續
      </button>
    )
  }

  return <div ref={btnRef} className={cn('flex justify-center min-h-11', className)} />
}
