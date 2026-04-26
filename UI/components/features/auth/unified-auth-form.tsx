"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { GithubIcon } from './github-icon'
import { GoogleSignInButton } from './google-gis-button'

const socialBtn =
  'flex items-center justify-center gap-[9px] py-[14px] px-2 border border-[rgba(59,130,246,0.2)] rounded-lg bg-[rgba(59,130,246,0.03)] font-mono text-sm font-semibold tracking-[0.04em] text-[var(--t1)] transition-all hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:-translate-y-px disabled:opacity-50'

export function UnifiedAuthForm() {
  const router = useRouter()
  const [googleLoading, setGoogleLoading] = useState(false)
  const [githubLoading, setGithubLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/onboarding-check')
    })
  }, [router])

  const handleGithub = async () => {
    setGithubLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      toast.error('Sign-in failed — try again')
      setGithubLoading(false)
    }
  }

  const isLoading = googleLoading || githubLoading

  return (
    <div className="flex flex-col gap-[13px] animate-fadeup" style={{ animationDelay: '0.2s' }}>
      <GoogleSignInButton disabled={isLoading} onLoadingChange={setGoogleLoading} />

      <button
        onClick={handleGithub}
        disabled={isLoading}
        className={socialBtn}
      >
        <GithubIcon />
        {githubLoading ? 'Redirecting...' : 'Continue with GitHub'}
      </button>

    </div>
  )
}
