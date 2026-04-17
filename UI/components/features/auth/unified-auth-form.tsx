"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { GoogleIcon } from './google-icon'

const primaryBtn =
  'w-full py-[14px] bg-gradient-to-br from-[var(--accent)] to-[#2563eb] rounded-lg font-mono text-sm font-bold tracking-[0.1em] text-white shadow-[0_4px_24px_var(--accent-glow)] transition-all hover:shadow-[0_8px_36px_var(--accent-glow)] hover:-translate-y-0.5 disabled:opacity-50'
const socialBtn =
  'flex items-center justify-center gap-[9px] py-[14px] px-2 border border-[var(--border-m)] rounded-lg bg-[var(--bg-el)] font-mono text-sm font-semibold tracking-[0.04em] text-[var(--t1)] transition-all hover:border-[var(--border-h)] hover:bg-[var(--bg-card)] hover:-translate-y-px disabled:opacity-50'

export function UnifiedAuthForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/onboarding-check')
    })
  }, [router])

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) {
      toast.error('Sign-in failed — try again')
      setIsLoading(false)
    }
    // On success the browser redirects to Google — no further action needed
  }

  return (
    <div className="flex flex-col gap-[13px] animate-fadeup" style={{ animationDelay: '0.2s' }}>
      <button
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className={socialBtn}
      >
        <GoogleIcon />
        {isLoading ? 'Redirecting...' : 'Continue with Google'}
      </button>

      <p className="font-mono text-xs text-[var(--t3)] text-center leading-relaxed">
        {"By continuing, you agree to our "}
        <span className="text-[var(--t2)] cursor-pointer hover:text-[var(--accent)]">Terms</span>
        {' & '}
        <span className="text-[var(--t2)] cursor-pointer hover:text-[var(--accent)]">Privacy</span>.
      </p>
    </div>
  )
}
