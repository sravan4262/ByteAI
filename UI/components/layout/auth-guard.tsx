"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { setTokenProvider } from '@/lib/api/http'
import { getCurrentUser, getMyBytes, getMyPreferences, updateProfile } from '@/lib/api/client'
import { getMeCache, setMeCache, clearMeCache } from '@/lib/user-cache'
import { AccountSuspendedScreen } from '@/components/auth/account-suspended-screen'
import type { Session } from '@supabase/supabase-js'
import type { ReactNode } from 'react'

function applyTheme(theme: string) {
  const html = document.documentElement
  html.classList.remove('theme-light', 'theme-hacker', 'theme-nord')
  if (theme !== 'dark') html.classList.add(`theme-${theme}`)
  if (theme === 'light') html.classList.remove('dark')
  else html.classList.add('dark')
  localStorage.setItem('byteai_theme', theme)
}

export function AuthGuard({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [suspended, setSuspended] = useState<{ message?: string } | null>(null)
  const router = useRouter()
  const hydrated = useRef(false)

  // ── Account-suspended interceptor ───────────────────────────────────────────
  // http.ts dispatches `byteai:account-suspended` whenever an API call returns
  // 403 ACCOUNT_SUSPENDED. We sign the user out of Supabase locally so the JWT
  // is forgotten, then mount the suspended screen in place of the app shell.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message?: string }>).detail
      setSuspended({ message: detail?.message })
      clearMeCache()
      void supabase.auth.signOut()
    }
    window.addEventListener('byteai:account-suspended', handler)
    return () => window.removeEventListener('byteai:account-suspended', handler)
  }, [])

  const handleSuspendedSignOut = () => {
    setSuspended(null)
    router.replace('/')
  }

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION with the real session from cookies
    // on mount — more reliable than getSession() which reads stale in-memory state
    // after a sign-out/sign-in cycle and would set session=null too early.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Wire Supabase session token into the http client for all API calls
  useEffect(() => {
    setTokenProvider(async () => {
      const { data } = await supabase.auth.getSession()
      return data.session?.access_token ?? null
    })
  }, [])

  // Global emergency sign-out: Ctrl+Shift+Esc from anywhere in the app
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'Escape') {
        clearMeCache()
        supabase.auth.signOut().then(() => router.replace('/'))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [router])

  // Populate MeCache once per session so any component can read own-user stats
  useEffect(() => {
    if (!session || hydrated.current) return
    hydrated.current = true

    const existing = getMeCache()
    if (existing?.avatarUrl) return

    Promise.all([getCurrentUser(), getMyBytes({ pageSize: 1 }), getMyPreferences()]).then(([user, myBytes, prefs]) => {
      if (!user) return
      // Fall back to Supabase avatar if DB has none
      const resolvedAvatar = user.avatarUrl || session.user.user_metadata?.avatar_url || null
      if (!user.avatarUrl && resolvedAvatar) {
        updateProfile({ customAvatarUrl: resolvedAvatar })
      }
      setMeCache({
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: resolvedAvatar,
        bio: user.bio,
        roleTitle: user.roleTitle,
        company: user.company,
        level: user.level,
        bytesCount: myBytes.total,
        followersCount: user.followersCount ?? 0,
        followingCount: user.followingCount ?? 0,
        isVerified: user.isVerified,
      })
      if (prefs?.theme) applyTheme(prefs.theme)
    })
  }, [session])

  useEffect(() => {
    if (session === null) {
      router.replace('/')
    }
  }, [session, router])

  // Account-suspended takeover supersedes everything else.
  if (suspended) {
    return <AccountSuspendedScreen message={suspended.message} onSignOut={handleSuspendedSignOut} />
  }

  // undefined = still loading; null = no session
  if (session === undefined || session === null) return null

  return <>{children}</>
}
