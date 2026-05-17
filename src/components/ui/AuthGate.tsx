import type { ReactNode } from 'react'
import GISButton from '@/components/ui/GISButton'
import OneTapPrompt from '@/components/ui/OneTapPrompt'

interface Props {
  loading: boolean
  loggedIn: boolean
  onSignIn?(): void
  loadingText?: string
  title?: string
  message?: string
  children: ReactNode
}

export default function AuthGate({
  loading,
  loggedIn,
  loadingText = 'Loading…',
  title,
  message = 'Sign in to continue',
  children,
}: Props) {
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg font-mono text-ink-muted text-sm">
        <span className="animate-pulse">{loadingText}</span>
      </div>
    )
  }

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg gap-4 font-mono">
        {/* OneTapPrompt fires silently; GISButton is the visible fallback */}
        <OneTapPrompt />
        <div className="border border-line p-8 text-center space-y-4 max-w-sm w-full">
          {title && <p className="text-sm uppercase tracking-widest text-ink-muted">{title}</p>}
          <p className="text-sm text-ink">{message}</p>
          <GISButton />
          <button
            onClick={() => window.history.length > 1 ? window.history.back() : (window.location.href = '/')}
            className="w-full text-sm text-ink-muted hover:text-ink transition-colors py-1"
          >
            ← Back
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
