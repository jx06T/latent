// GIS SDK singleton wrapper.
// initialize() is idempotent but the last call wins, so components
// must call initGIS() before renderGISButton() or promptOneTap().

import { isInAppBrowser } from '@/lib/browser-detection'
import type { GISCredentialResponse, GISPromptNotification } from '@/types/gis'

export type CredentialHandler = (idToken: string) => Promise<void> | void

// Module-level singleton — one GIS config per page.
let _initialized = false

export function isGISReady(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.google !== 'undefined' &&
    !!window.google?.accounts?.id
  )
}

export function isGISInitialized(): boolean {
  return _initialized
}

/**
 * Initialize GIS with a credential callback.
 * Automatically selects popup vs redirect mode based on the browser UA.
 * Safe to call multiple times — last call's callback wins.
 */
export function initGIS(onCredential: CredentialHandler): void {
  if (!isGISReady()) return

  const mode: 'popup' | 'redirect' = isInAppBrowser() ? 'redirect' : 'popup'

  window.google!.accounts.id.initialize({
    client_id: import.meta.env.PUBLIC_GCP_CLIENT_ID as string,
    ux_mode: mode,
    auto_select: false,
    cancel_on_tap_outside: true,
    ...(mode === 'redirect'
      ? { login_uri: `${window.location.origin}/auth-callback` }
      : { callback: (resp: GISCredentialResponse) => onCredential(resp.credential) }),
  })

  _initialized = true
}

/**
 * Render the official Google Sign-In button inside the given element.
 * Must be called after initGIS().
 */
export function renderGISButton(el: HTMLElement, width = 280): void {
  if (!isGISReady() || !_initialized) return
  window.google!.accounts.id.renderButton(el, {
    theme: 'outline',
    size: 'large',
    width,
    text: 'signin_with',
    locale: 'zh-TW',
  })
}

/**
 * Trigger the One Tap prompt.
 * onNotShown is called if One Tap is suppressed or dismissed — use it to show a fallback modal.
 */
export function promptOneTap(onNotShown: () => void): void {
  if (!isGISReady() || !_initialized) {
    onNotShown()
    return
  }
  window.google!.accounts.id.prompt((n: GISPromptNotification) => {
    if (n.isNotDisplayed() || n.isSkippedMoment() || n.isDismissedMoment()) {
      onNotShown()
    }
  })
}

/** Cancel any active One Tap overlay. */
export function cancelOneTap(): void {
  if (isGISReady()) window.google!.accounts.id.cancel()
}
