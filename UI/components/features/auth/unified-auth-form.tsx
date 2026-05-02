"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { safeNextOr } from '@/lib/utils/safe-redirect'
import Link from 'next/link'
import { GoogleSignInButton } from './google-gis-button'
import { AppleSignInButton } from './apple-sign-in-button'

export function UnifiedAuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeNextOr(searchParams?.get('next'), '')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        // If a safe `next` was provided, honor it. Otherwise resume normal flow.
        router.replace(next || '/onboarding-check')
      }
    })
  }, [router, next])

  const isLoading = googleLoading || appleLoading

  return (
    <div className="flex flex-col gap-[13px] animate-fadeup" style={{ animationDelay: '0.2s' }}>
      <GoogleSignInButton disabled={isLoading} onLoadingChange={setGoogleLoading} next={next} />
      <AppleSignInButton disabled={isLoading} onLoadingChange={setAppleLoading} next={next} />

      <p className="text-center text-[10px] text-[var(--t3)] leading-relaxed px-2">
        By continuing, you agree to our{' '}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-[var(--t2)]">
          Privacy Policy
        </Link>
        {' '}and{' '}
        <Link href="/cookies" className="underline underline-offset-2 hover:text-[var(--t2)]">
          Cookie Policy
        </Link>
      </p>
    </div>
  )
}
