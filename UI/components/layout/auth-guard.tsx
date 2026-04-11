"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { setTokenProvider } from '@/lib/api/http'
import type { ReactNode } from 'react'

/**
 * Client-side auth guard — double-checks Clerk session state after middleware.
 * Also wires the Clerk getToken() function into the API http client so every
 * apiFetch() call automatically includes the Authorization: Bearer header.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const router = useRouter()

  // Wire Clerk's getToken into the http client for all API calls
  useEffect(() => {
    setTokenProvider(getToken)
  }, [getToken])

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace('/')
    }
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded || !isSignedIn) return null

  return <>{children}</>
}
