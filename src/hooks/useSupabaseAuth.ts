import { useState, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface SupabaseAuth {
  user: User | null
  isLoggedIn: boolean
  accessToken: string | null
  loading: boolean
  signIn: (targetPath?: string) => Promise<void>
  signOut: () => Promise<void>
}

export function useSupabaseAuth(): SupabaseAuth {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAccessToken(session?.access_token ?? null)
      setLoading(false)

      // OAuth 回傳後清掉 URL hash，避免殘留 # 在下次登入時疊成 ##
      if (session && typeof window !== 'undefined' && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      setAccessToken(session?.access_token ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (targetPath?: string) => {
    const origin = import.meta.env.PUBLIC_SITE_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '')
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/'
    const next = encodeURIComponent(targetPath ?? currentPath)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin.replace(/\/$/, '')}/auth/callback?next=${next}`,
      },
    })
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  return { user, isLoggedIn: user !== null, accessToken, loading, signIn, signOut }
}
