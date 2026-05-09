import { useState, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'

export type Profile = Tables<'profiles'>

export interface SupabaseAuth {
  user: User | null
  profile: Profile | null
  isLoggedIn: boolean
  isOnboarded: boolean
  accessToken: string | null
  loading: boolean
  signIn: (targetPath?: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export function useSupabaseAuth(): SupabaseAuth {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  const loadProfile = useCallback(async (userId: string) => {
    setProfileLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (error) console.error('載入 Profile 失敗:', error)
      setProfile(data ?? null)
    } catch (err) {
      console.error('載入 Profile 發生未知錯誤:', err)
      setProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    let mounted = true

    // Avoid getSession() — it can hang on network refresh of expired tokens.
    // onAuthStateChange always fires INITIAL_SESSION immediately on subscribe.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      // TOKEN_REFRESHED fires ~hourly; profile hasn't changed, only update token.
      if (event === 'TOKEN_REFRESHED') {
        setAccessToken(session?.access_token ?? null)
        return
      }

      // Synchronously update auth state so React can batch these together.
      setUser(session?.user ?? null)
      setAccessToken(session?.access_token ?? null)

      if (session?.user) {
        // Mark profile as loading synchronously to prevent a gap where
        // loading=false but profile=null (would trigger incorrect redirects).
        setProfileLoading(true)
        // Push the actual DB query to the next tick to release Supabase's
        // internal auth lock — awaiting inside this callback causes deadlock.
        const userId = session.user.id
        setTimeout(() => { if (mounted) loadProfile(userId) }, 0)
      } else {
        setProfile(null)
        setProfileLoading(false)
      }

      setAuthLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    await loadProfile(user.id)
  }, [user, loadProfile])

  const signIn = useCallback(async (targetPath?: string) => {
    const origin = import.meta.env.PUBLIC_SITE_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '')
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/'
    const next = encodeURIComponent(targetPath ?? currentPath)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin.replace(/\/$/, '')}/api/auth/callback?next=${next}`,
      },
    })
  }, [])

  const signOut = useCallback(async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('latent:onboarding:draft')
    }
    await supabase.auth.signOut()
    if (typeof window !== 'undefined') {
      window.location.replace('/')
    }
  }, [])

  return {
    user,
    profile,
    isLoggedIn: user !== null,
    isOnboarded: profile?.is_onboarded ?? false,
    accessToken,
    loading: authLoading || (user !== null && profileLoading),
    signIn,
    signOut,
    refreshProfile,
  }
}
