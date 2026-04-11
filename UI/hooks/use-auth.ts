"use client"

import { useAuth as useClerkAuth, useUser } from '@clerk/nextjs'
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
}


export function useAuth() {
  const { isSignedIn, isLoaded, signOut, getToken } = useClerkAuth()
  const { user } = useUser()
  const router = useRouter()

  const completeOnboarding = useCallback(() => {
    setCookie('byteai_onboarded', '1')
    router.push('/feed')
  }, [router])

  const logout = useCallback(async () => {
    // Do NOT delete byteai_onboarded — onboarding status is per-device and should
    // survive sessions. Returning users are routed via /onboarding-check which
    // re-validates against the backend and sets the cookie if needed.
    await signOut()
    router.push('/')
  }, [signOut, router])

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
