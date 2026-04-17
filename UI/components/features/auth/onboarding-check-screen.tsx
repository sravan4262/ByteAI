"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { setTokenProvider } from '@/lib/api/http'
import { getCurrentUser } from '@/lib/api'

function setOnboardedCookie() {
  document.cookie = 'byteai_onboarded=1; path=/; max-age=2592000; SameSite=Lax'
}

/**
 * Intermediate landing page after Google OAuth sign-in.
 * Checks whether the user has completed onboarding and routes accordingly.
 */
export function OnboardingCheckScreen() {
  const router = useRouter()

  useEffect(() => {
    // Wire token provider so getCurrentUser() can auth
    setTokenProvider(async () => {
      const { data } = await supabase.auth.getSession()
      return data.session?.access_token ?? null
    })

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/'); return }

      getCurrentUser()
        .then((user) => {
          if (user?.isOnboarded) {
            setOnboardedCookie()
            router.replace('/feed')
          } else {
            router.replace('/onboarding')
          }
        })
        .catch(() => router.replace('/onboarding'))
    })
  }, [router])

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-[var(--bg)]">
      <div className="w-6 h-6 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
      <span className="font-mono text-[11px] text-[var(--t3)] tracking-[0.1em]">// CHECKING SESSION...</span>
    </div>
  )
}
