"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { GoogleSignInButton } from './google-gis-button'
import { AppleSignInButton } from './apple-sign-in-button'

const socialBtn =
  'flex items-center justify-center gap-[9px] py-[14px] px-2 border border-[rgba(59,130,246,0.2)] rounded-lg bg-[rgba(59,130,246,0.03)] font-mono text-sm font-semibold tracking-[0.04em] text-[var(--t1)] transition-all hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:-translate-y-px disabled:opacity-50'

export function UnifiedAuthForm() {
  const router = useRouter()
  const [googleLoading, setGoogleLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/onboarding-check')
    })
  }, [router])

  const isLoading = googleLoading || appleLoading

  return (
    <div className="flex flex-col gap-[13px] animate-fadeup" style={{ animationDelay: '0.2s' }}>
      <GoogleSignInButton disabled={isLoading} onLoadingChange={setGoogleLoading} />
      <AppleSignInButton disabled={isLoading} onLoadingChange={setAppleLoading} />

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
