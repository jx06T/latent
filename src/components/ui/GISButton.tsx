/**
 * Renders the official Google Sign-In button.
 * Auth logic (initGIS, credential handling) is owned by <GISInit />.
 * This component only renders the button UI once GIS is ready + initialized.
 * Falls back to a Supabase OAuth redirect button if GIS fails to load within 3 s.
 */
import { useRef, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { renderGISButton, isGISReady, isGISInitialized } from '@/lib/gis'
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

export default function GISButton({ className }: Props) {
  const btnRef = useRef<HTMLDivElement>(null)
  const [showFallback, setShowFallback] = useState(false)

  useEffect(() => {
    let gisRendered = false
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null

    const mount = () => {
      if (!isGISReady() || !isGISInitialized() || !btnRef.current) return false
      renderGISButton(btnRef.current, btnRef.current.offsetWidth || 280)
      gisRendered = true
      return true
    }

    if (!mount()) {
      const interval = setInterval(() => {
        if (mount()) {
          clearInterval(interval)
          if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null }
        }
      }, 100)

      fallbackTimer = setTimeout(() => {
        clearInterval(interval)
        if (!gisRendered) setShowFallback(true)
      }, 3000)

      return () => {
        clearInterval(interval)
        if (fallbackTimer) clearTimeout(fallbackTimer)
      }
    }
  }, [])

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
