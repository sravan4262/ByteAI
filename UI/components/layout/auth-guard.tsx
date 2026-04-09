"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import type { ReactNode } from 'react'

/**
 * Client-side auth guard — catches stale cookies that let the proxy through.
 * If localStorage says the user is not authenticated, clears cookies and
 * redirects to the auth page.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const { auth } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!auth.isAuthenticated) {
      router.replace('/')
    }
  }, [auth.isAuthenticated, router])

  // Render nothing while redirecting to avoid a flash of protected content
  if (!auth.isAuthenticated) return null

  return <>{children}</>
}
