/**
 * Page-level GIS singleton — mount once per page (via Layout) to enable:
 *   1. promptOneTap() calls from anywhere (CommentsSection overlay, LikeButton, etc.)
 *   2. GISButton rendering (waits for isGISInitialized())
 *
 * On successful sign-in, dispatches 'latent:auth-success' so LoginModal auto-closes.
 */
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { initGIS, isGISReady } from '@/lib/gis'
import { consumePendingReturnUrl } from '@/lib/pending-action'

export default function GISInit() {
  useEffect(() => {
    const handler = async (idToken: string) => {
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      })
      if (!error) {
        document.dispatchEvent(new CustomEvent('latent:auth-success'))
        const returnUrl = consumePendingReturnUrl()
        if (returnUrl !== window.location.pathname) {
          window.location.replace(returnUrl)
        }
      }
    }

    if (isGISReady()) {
      initGIS(handler)
      return
    }

    const interval = setInterval(() => {
      if (isGISReady()) {
        initGIS(handler)
        clearInterval(interval)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [])

  return null
}
