// Persists user intent across auth redirects so actions can be replayed
// automatically after login (e.g. auto-vote after signing in from LikeButton).

const ACTION_KEY = 'latent:pendingAction'
const RETURN_URL_KEY = 'latent:returnUrl'

export type PendingActionType = 'VOTE'

export interface PendingAction {
  type: PendingActionType
  payload: Record<string, string>
}

export function savePendingAction(type: PendingActionType, payload: Record<string, string>): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(ACTION_KEY, JSON.stringify({ type, payload }))
}

export function consumePendingAction(): PendingAction | null {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem(ACTION_KEY)
  if (!raw) return null
  localStorage.removeItem(ACTION_KEY)
  try {
    return JSON.parse(raw) as PendingAction
  } catch {
    return null
  }
}

export function peekPendingAction(): PendingAction | null {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem(ACTION_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PendingAction
  } catch {
    return null
  }
}

export function savePendingReturnUrl(path: string): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(RETURN_URL_KEY, path)
}

export function consumePendingReturnUrl(): string {
  if (typeof localStorage === 'undefined') return '/'
  const url = localStorage.getItem(RETURN_URL_KEY)
  localStorage.removeItem(RETURN_URL_KEY)
  return url ?? (typeof window !== 'undefined' ? window.location.pathname : '/')
}
