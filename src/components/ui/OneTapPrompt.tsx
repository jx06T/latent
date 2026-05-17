/**
 * Fires the Google One Tap prompt once GISInit has initialized the SDK.
 * Renders nothing. Place alongside a <GISButton /> so the user always has
 * a visible fallback if One Tap is suppressed by Google.
 *
 * onFallback — called when One Tap is not shown (suppressed / dismissed / in-app browser).
 *              Defaults to no-op (assumes a visible GISButton is the fallback).
 */
import { useEffect } from 'react'
import { promptOneTap, isGISReady, isGISInitialized } from '@/lib/gis'

interface Props {
  onFallback?: () => void
}

export default function OneTapPrompt({ onFallback }: Props) {
  useEffect(() => {
    const fallback = onFallback ?? (() => {})

    const tryPrompt = () => {
      if (!isGISReady() || !isGISInitialized()) return false
      promptOneTap(fallback)
      return true
    }

    if (!tryPrompt()) {
      const interval = setInterval(() => {
        if (tryPrompt()) clearInterval(interval)
      }, 100)
      return () => clearInterval(interval)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
