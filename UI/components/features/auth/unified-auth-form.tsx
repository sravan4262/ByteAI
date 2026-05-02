"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Ban } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { safeNextOr } from '@/lib/utils/safe-redirect'
import Link from 'next/link'
import { GoogleSignInButton } from './google-gis-button'
import { AppleSignInButton } from './apple-sign-in-button'

const SUPPORT_EMAIL = 'officialbyteai@gmail.com'

export function UnifiedAuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeNextOr(searchParams?.get('next'), '')
  const errorParam = searchParams?.get('error')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)
  // True when Supabase returns error_code=user_banned in the OAuth redirect hash.
  // Set synchronously-as-possible (first effect) so the session redirect below
  // sees it before the async getSession() resolves.
  const [isBannedFromHash, setIsBannedFromHash] = useState(false)

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash) return
    const params = new URLSearchParams(hash)
    if (params.get('error_code') === 'user_banned') {
      setIsBannedFromHash(true)
      router.replace('/?error=account_suspended')
    }
  }, [router])

  useEffect(() => {
    // Don't bounce the user into the app if they're suspended (either path).
    if (errorParam === 'account_suspended' || isBannedFromHash) return

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace(next || '/onboarding-check')
      }
    })
  }, [router, next, errorParam, isBannedFromHash])

  const isLoading = googleLoading || appleLoading
  const isSuspended = errorParam === 'account_suspended' || isBannedFromHash

  return (
    <div className="flex flex-col gap-[13px] animate-fadeup" style={{ animationDelay: '0.2s' }}>
      {isSuspended && (
        <div className="rounded-lg border border-[rgba(239,68,68,0.35)] bg-[rgba(239,68,68,0.06)] p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Ban size={14} className="text-[var(--red,#ef4444)]" />
            <span className="font-mono text-[10px] font-bold tracking-[0.12em] text-[var(--red,#ef4444)]">
              ACCOUNT_SUSPENDED
            </span>
          </div>
          <p className="font-mono text-[11px] leading-relaxed text-[var(--t1)]">
            Your account has been suspended and cannot sign in. Please contact{' '}
            <a href={`mailto:${SUPPORT_EMAIL}?subject=Account%20suspension%20appeal`}
               className="text-[var(--accent)] underline underline-offset-2">
              {SUPPORT_EMAIL}
            </a>
            {' '}to appeal.
          </p>
        </div>
      )}

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
