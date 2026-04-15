"use client"

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useUser, useClerk } from '@clerk/nextjs'
import { setTokenProvider } from '@/lib/api/http'
import { getCurrentUser, getMyBytes, getMyPreferences, updateProfile } from '@/lib/api/client'
import { getMeCache, setMeCache, clearMeCache } from '@/lib/user-cache'
import type { ReactNode } from 'react'

function applyTheme(theme: string) {
  const html = document.documentElement
  html.classList.remove('theme-light', 'theme-hacker', 'theme-nord')
  if (theme !== 'dark') html.classList.add(`theme-${theme}`)
  if (theme === 'light') html.classList.remove('dark')
  else html.classList.add('dark')
  localStorage.setItem('byteai_theme', theme)
}

/**
 * Client-side auth guard — double-checks Clerk session state after middleware.
 * Also wires the Clerk getToken() function into the API http client so every
 * apiFetch() call automatically includes the Authorization: Bearer header.
 * Populates the MeCache on first load so own-user data is available everywhere.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const { user: clerkUser } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const hydrated = useRef(false)

  // Wire Clerk's getToken into the http client for all API calls
  useEffect(() => {
    setTokenProvider(getToken)
  }, [getToken])

  // Global emergency sign-out: Ctrl+Shift+Esc from anywhere in the app
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'Escape') {
        clearMeCache()
        signOut(() => router.replace('/'))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [signOut, router])

  // Populate MeCache once per session so any component can read own-user stats
  useEffect(() => {
    if (!isSignedIn || !clerkUser || hydrated.current) return
    hydrated.current = true

    // If already cached AND avatar is present, skip the full fetch
    const existing = getMeCache()
    if (existing?.avatarUrl) return

    Promise.all([getCurrentUser(), getMyBytes({ pageSize: 1 }), getMyPreferences()]).then(([user, myBytes, prefs]) => {
      if (!user) return
      // If DB has no avatar, fall back to Clerk's image and persist it so all
      // future requests (post cards, comment authors) also return the correct URL.
      const resolvedAvatar = user.avatarUrl || clerkUser?.imageUrl || null
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
      // Apply saved theme from DB preferences (overrides localStorage)
      if (prefs?.theme) applyTheme(prefs.theme)
    })
  }, [isSignedIn, clerkUser])

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace('/')
    }
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded || !isSignedIn) return null

  return <>{children}</>
}
