"use client"

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { setTokenProvider } from '@/lib/api/http'
import { getCurrentUser, getMyBytes } from '@/lib/api/client'
import { getMeCache, setMeCache } from '@/lib/user-cache'
import type { ReactNode } from 'react'

/**
 * Client-side auth guard — double-checks Clerk session state after middleware.
 * Also wires the Clerk getToken() function into the API http client so every
 * apiFetch() call automatically includes the Authorization: Bearer header.
 * Populates the MeCache on first load so own-user data is available everywhere.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const router = useRouter()
  const hydrated = useRef(false)

  // Wire Clerk's getToken into the http client for all API calls
  useEffect(() => {
    setTokenProvider(getToken)
  }, [getToken])

  // Populate MeCache once per session so any component can read own-user stats
  useEffect(() => {
    if (!isSignedIn || hydrated.current) return
    hydrated.current = true

    // Skip if already cached (e.g. navigated back to the app without closing tab)
    if (getMeCache()) return

    Promise.all([getCurrentUser(), getMyBytes({ pageSize: 1 })]).then(([user, myBytes]) => {
      if (!user) return
      setMeCache({
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        roleTitle: user.roleTitle,
        company: user.company,
        level: user.level,
        bytesCount: myBytes.total,
        followersCount: user.followersCount ?? 0,
        followingCount: user.followingCount ?? 0,
        isVerified: user.isVerified,
      })
    })
  }, [isSignedIn])

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace('/')
    }
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded || !isSignedIn) return null

  return <>{children}</>
}
