import type { ReactNode } from 'react'
import GoogleSignInButton from '@/components/ui/GoogleSignInButton'

interface Props {
  loading: boolean
  loggedIn: boolean
  onSignIn(): void
  loadingText?: string
  title?: string
  message?: string
  children: ReactNode
}

export default function AuthGate({
  loading,
  loggedIn,
  onSignIn,
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
        <div className="border border-line p-8 text-center space-y-4 max-w-sm w-full">
          {title && <p className="text-sm uppercase tracking-widest text-ink-muted">{title}</p>}
          <p className="text-sm text-ink">{message}</p>
          <GoogleSignInButton onClick={onSignIn} className="w-full" />
        </div>
      </div>
    )
  }

  return <>{children}</>
}
