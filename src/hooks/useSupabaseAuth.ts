import { useState, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface Profile {
  id: string
  handle: string
  nickname: string
  bio: string
  affiliation: string | null
  age_group: string | null
  referral_source: string | null
  is_onboarded: boolean
  email: string | null
  created_at: string
  updated_at: string
}

export interface SupabaseAuth {
  user: User | null
  profile: Profile | null
  isLoggedIn: boolean
  isOnboarded: boolean
  accessToken: string | null
  loading: boolean
  signIn: (targetPath?: string) => Promise<void>
  signOut: () => Promise<void>
}

export function useSupabaseAuth(): SupabaseAuth {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    setProfile(data ?? null)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAccessToken(session?.access_token ?? null)

      if (session && typeof window !== 'undefined' && window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }

      if (session?.user) {
        loadProfile(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      setAccessToken(session?.access_token ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [loadProfile])

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
    loading,
    signIn,
    signOut,
  }
}
