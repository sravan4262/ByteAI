"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { GoogleIcon } from './google-icon'
import { GithubIcon } from './github-icon'

const socialBtn =
  'flex items-center justify-center gap-[9px] py-[14px] px-2 border border-[rgba(59,130,246,0.2)] rounded-lg bg-[rgba(59,130,246,0.03)] font-mono text-sm font-semibold tracking-[0.04em] text-[var(--t1)] transition-all hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:-translate-y-px disabled:opacity-50'

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
        className={socialBtn}
      >
        <GithubIcon />
        {loadingProvider === 'github' ? 'Redirecting...' : 'Continue with GitHub'}
      </button>

    </div>
  )
}
