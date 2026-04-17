"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { setTokenProvider, apiFetch } from '@/lib/api/http'
import { getCurrentUser } from '@/lib/api'
import { setMeCache } from '@/lib/user-cache'

function setOnboardedCookie() {
  document.cookie = 'byteai_onboarded=1; path=/; max-age=2592000; SameSite=Lax'
}

/**
 * Kept as a fallback for direct navigation to /onboarding-check.
 * The primary routing path (OAuth callback → /feed or /onboarding) is
 * handled entirely server-side in /auth/callback/route.ts.
 */
export function OnboardingCheckScreen() {
  const router = useRouter()

  useEffect(() => {
    setTokenProvider(async () => {
      const { data } = await supabase.auth.getSession()
      return data.session?.access_token ?? null
    })

    let handled = false

    const proceed = async (session: Session) => {
      if (handled) return
      handled = true

      const { user: supabaseUser } = session
      const displayName = supabaseUser.user_metadata?.full_name
        || supabaseUser.user_metadata?.name
        || supabaseUser.email?.split('@')[0]
        || 'User'
      const avatarUrl = supabaseUser.user_metadata?.avatar_url ?? null
      const email = supabaseUser.email ?? null

      await apiFetch('/api/auth/provision', {
        method: 'POST',
        body: JSON.stringify({ displayName, avatarUrl, email }),
      }).catch(() => {})

      getCurrentUser()
        .then((user) => {
          if (user) {
            setMeCache({
              userId: user.id,
              username: user.username,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
              bio: user.bio ?? undefined,
              roleTitle: user.roleTitle ?? undefined,
              company: user.company ?? undefined,
              level: user.level,
              bytesCount: user.bytesCount ?? 0,
              followersCount: user.followersCount ?? 0,
              followingCount: user.followingCount ?? 0,
              isVerified: user.isVerified,
            })
          }
          if (user?.isOnboarded) {
            setOnboardedCookie()
            router.replace('/feed')
          } else {
            router.replace('/onboarding')
          }
        })
        .catch(() => router.replace('/onboarding'))
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
          proceed(session)
        }
      }
    )

    const timeout = setTimeout(() => {
      if (!handled) router.replace('/')
    }, 6000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [router])

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-[var(--bg)]">
      <div className="w-6 h-6 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
      <span className="font-mono text-[11px] text-[var(--t3)] tracking-[0.1em]">// CHECKING SESSION...</span>
    </div>
  )
}
