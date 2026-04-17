"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { GoogleIcon } from './google-icon'
import { GithubIcon } from './github-icon'

const socialBtn =
  'flex items-center justify-center gap-[9px] py-[14px] px-2 border border-[var(--border-m)] rounded-lg bg-[var(--bg-el)] font-mono text-sm font-semibold tracking-[0.04em] text-[var(--t1)] transition-all hover:border-[var(--border-h)] hover:bg-[var(--bg-card)] hover:-translate-y-px disabled:opacity-50'

type Provider = 'google' | 'github'

export function UnifiedAuthForm() {
  const router = useRouter()
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/onboarding-check')
    })
  }, [router])

  const handleOAuth = async (provider: Provider) => {
    setLoadingProvider(provider)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        ...(provider === 'google' && {
          queryParams: { access_type: 'offline', prompt: 'consent' },
        }),
      },
    })
    if (error) {
      toast.error('Sign-in failed — try again')
      setLoadingProvider(null)
    }
  }

  const isLoading = loadingProvider !== null

  return (
    <div className="flex flex-col gap-[13px] animate-fadeup" style={{ animationDelay: '0.2s' }}>
      <button
        onClick={() => handleOAuth('google')}
        disabled={isLoading}
        className={socialBtn}
      >
        <GoogleIcon />
        {loadingProvider === 'google' ? 'Redirecting...' : 'Continue with Google'}
      </button>

      <button
        onClick={() => handleOAuth('github')}
        disabled={isLoading}
        className={`${socialBtn} hover:border-[rgba(255,255,255,0.2)]`}
      >
        <GithubIcon />
        {loadingProvider === 'github' ? 'Redirecting...' : 'Continue with GitHub'}
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
