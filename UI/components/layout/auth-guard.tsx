"use client"

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { setTokenProvider } from '@/lib/api/http'
import { getCurrentUser, getMyBytes, getMyPreferences, updateProfile } from '@/lib/api/client'
import { getMeCache, setMeCache, clearMeCache } from '@/lib/user-cache'
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
  const router = useRouter()
  const hydrated = useRef(false)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    // Listen for auth state changes (sign-in, sign-out, token refresh)
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

  // undefined = still loading; null = no session
  if (session === undefined || session === null) return null

  return <>{children}</>
}
