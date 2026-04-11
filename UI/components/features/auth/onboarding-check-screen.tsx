"use client"

import { useEffect } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { setTokenProvider } from '@/lib/api/http'
import { getCurrentUser } from '@/lib/api'

function hasCookie(name: string) {
  return document.cookie.split(';').some((c) => c.trim().startsWith(`${name}=`))
}

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

    // ── Fast path ─────────────────────────────────────────────────────────────
    // Cookie is the client-side record of completed onboarding. If it's here,
    // skip the backend round-trip entirely.
    if (hasCookie('byteai_onboarded')) {
      router.replace('/feed')
      return
    }

    // ── Slow path (first login or new device) ─────────────────────────────────
    getCurrentUser().then((user) => {
      if (user && user.seniority) {
        // Cross-device login: user completed onboarding elsewhere — restore cookie
        setOnboardedCookie()
        router.replace('/feed')
      } else if (user) {
        // User record exists but onboarding not complete
        router.replace('/onboarding')
      } else {
        // API failed — treat as unknown; send to onboarding (safe fallback)
        router.replace('/onboarding')
      }
    })
  }, [isLoaded, userLoaded, isSignedIn, router])

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-[var(--bg)]">
      <div className="w-6 h-6 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
      <span className="font-mono text-[11px] text-[var(--t3)] tracking-[0.1em]">// CHECKING SESSION...</span>
    </div>
  )
}
