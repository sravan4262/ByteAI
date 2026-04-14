"use client"

import { useEffect } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { setTokenProvider } from '@/lib/api/http'
import { getCurrentUser } from '@/lib/api'

function setOnboardedCookie() {
  document.cookie = 'byteai_onboarded=1; path=/; max-age=2592000; SameSite=Lax'
}

/**
 * Intermediate landing page after any sign-in (email or OAuth).
 *
 * Routing priority:
 * 1. Cookie already present → go straight to /feed (handles returning users
 *    and avoids an unnecessary API round-trip).
 * 2. No cookie → ask the backend. If the user has seniority set, they finished
 *    onboarding on another device — restore the cookie and go to /feed.
 * 3. If the API call fails, fall back to the cookie as a safety net so a
 *    transient backend error never traps a known-good user in onboarding.
 * 4. Otherwise → /onboarding (genuinely new user).
 */
export function OnboardingCheckScreen() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const { isLoaded: userLoaded } = useUser()
  const router = useRouter()

  useEffect(() => {
    setTokenProvider(getToken)
  }, [getToken])

  useEffect(() => {
    if (!isLoaded || !userLoaded) return
    if (!isSignedIn) { router.replace('/'); return }

    // Always verify with the backend — the cookie fast-path is intentionally
    // removed here. The cookie exists for the middleware (so it doesn't redirect
    // on every in-app navigation), not for this check. Skipping the backend call
    // here caused returning cookies from previous accounts to bypass onboarding
    // for newly registered users on the same device.
    getCurrentUser()
      .then((user) => {
        if (user?.isOnboarded) {
          // Completed onboarding (this or another device) — restore cookie and go to feed
          setOnboardedCookie()
          router.replace('/feed')
        } else {
          // New user or onboarding not complete — send to onboarding
          router.replace('/onboarding')
        }
      })
      .catch(() => {
        // Network/API error — default to onboarding, don't trap the user
        router.replace('/onboarding')
      })
  }, [isLoaded, userLoaded, isSignedIn, router])

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-[var(--bg)]">
      <div className="w-6 h-6 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
      <span className="font-mono text-[11px] text-[var(--t3)] tracking-[0.1em]">// CHECKING SESSION...</span>
    </div>
  )
}

