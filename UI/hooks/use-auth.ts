"use client"

import { useAuth as useClerkAuth, useUser, useClerk } from '@clerk/nextjs'
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { clearMeCache } from '@/lib/user-cache'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
}


export function useAuth() {
  const { isSignedIn, isLoaded, signOut, getToken } = useClerkAuth()
  const { user } = useUser()
  const clerk = useClerk()
  const router = useRouter()

  const completeOnboarding = useCallback(() => {
    setCookie('byteai_onboarded', '1')
    router.push('/feed')
  }, [router])

  const logout = useCallback(async () => {
    // Clear the session-scoped user cache
    clearMeCache()
    // Clear feed context so stale posts don't show on next login
    try { sessionStorage.removeItem('byteai_feed_context') } catch {}
    // Do NOT delete byteai_onboarded — onboarding status is per-device and should
    // survive sessions. Returning users are routed via /onboarding-check which
    // re-validates against the backend and sets the cookie if needed.
    try {
      // Clear all active sessions (handles multi-session edge cases)
      const sessions = clerk.client?.activeSessions ?? []
      await Promise.all(sessions.map(s => s.end()))
    } catch {
      // ignore — proceed to signOut regardless
    }
    // signOut with redirectUrl so Clerk completes cleanup before navigating
    await signOut({ redirectUrl: '/' })
  }, [signOut, clerk, router])

  return {
    auth: {
      isAuthenticated: isSignedIn ?? false,
      isLoaded,
    },
    getToken,
    completeOnboarding,
    logout,
    user,
  }
}
