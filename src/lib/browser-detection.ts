/**
 * Detects LINE, Facebook, and Instagram in-app browsers.
 * These environments block popup windows, so we must use redirect mode for GIS auth.
 */
export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /FBAN|FBAV|Instagram|Line|MicroMessenger/i.test(ua)
}
