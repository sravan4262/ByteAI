"use client"

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { clearMeCache } from '@/lib/user-cache'
import type { Session } from '@supabase/supabase-js'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
}

export function useAuth() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  const completeOnboarding = useCallback(() => {
    setCookie('byteai_onboarded', '1')
    router.push('/feed')
  }, [router])

  const logout = useCallback(async () => {
    clearMeCache()
    try { sessionStorage.removeItem('byteai_feed_context') } catch {}
    document.cookie = 'byteai_onboarded=; path=/; max-age=0; SameSite=Lax'
    await supabase.auth.signOut()
    router.replace('/')
  }, [router])

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  }, [])

  return {
    auth: {
      isAuthenticated: !!session,
      isLoaded: session !== undefined,
    },
    getToken,
    completeOnboarding,
    logout,
    user: session?.user ?? null,
  }
}
