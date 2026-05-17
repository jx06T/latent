import { useState, useEffect, useCallback, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { savePendingReturnUrl } from '@/lib/pending-action'
import { promptOneTap, isGISInitialized } from '@/lib/gis'
import type { Tables } from '@/lib/database.types'

export type Profile = Tables<'profiles'>

export interface SupabaseAuth {
  user: User | null
  profile: Profile | null
  isLoggedIn: boolean
  isOnboarded: boolean
  accessToken: string | null
  loading: boolean
  signIn: (targetPath?: string) => void
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export function useSupabaseAuth(): SupabaseAuth {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  // Tracks the user id that has already been loaded so SIGNED_IN for the same
  // user (e.g. after a tab wake-up / session recovery) can skip the profile
  // reload cycle — which would otherwise unmount the editor and erase unsaved edits.
  const loadedUserIdRef = useRef<string | null>(null)

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

      // SIGNED_IN can fire again on tab wake-up / session recovery for the
      // exact same user that is already loaded.  Reloading the profile would
      // set profileLoading=true → AuthGate unmounts the editor → unsaved edits
      // are lost.  Skip if the user id hasn't actually changed.
      if (event === 'SIGNED_IN' && session?.user && session.user.id === loadedUserIdRef.current) {
        setAccessToken(session?.access_token ?? null)
        return
      }

      // Synchronously update auth state so React can batch these together.
      setUser(session?.user ?? null)
      setAccessToken(session?.access_token ?? null)
      loadedUserIdRef.current = session?.user?.id ?? null

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
        loadedUserIdRef.current = null
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

  const signIn = useCallback((targetPath?: string) => {
    if (typeof window === 'undefined') return

    const returnPath =
      typeof targetPath === 'string' &&
        targetPath.startsWith('/') &&
        !targetPath.startsWith('//')
        ? targetPath
        : window.location.pathname

    savePendingReturnUrl(returnPath)

    // Show modal immediately — user always has a visible fallback.
    // Also fire One Tap on top if GIS is ready; no-op callback since the
    // modal is already open, so dismiss/skip doesn't cause a second popup.
    document.dispatchEvent(new CustomEvent('latent:show-login-modal'))
    if (isGISInitialized()) {
      promptOneTap(() => {})
    }
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
