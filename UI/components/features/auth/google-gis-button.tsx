"use client"

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { GoogleIcon } from './google-icon'

const visibleBtnCls =
  'flex w-full items-center justify-center gap-[9px] py-[14px] px-2 border border-[rgba(59,130,246,0.2)] rounded-lg bg-[rgba(59,130,246,0.03)] font-mono text-sm font-semibold tracking-[0.04em] text-[var(--t1)] transition-all hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:-translate-y-px disabled:opacity-50'

interface Props {
  disabled?: boolean
  onLoadingChange?: (loading: boolean) => void
}

export function GoogleSignInButton({ disabled, onLoadingChange }: Props) {
  const [loading, setLoading] = useState(false)

  const setBusy = useCallback((b: boolean) => {
    setLoading(b)
    onLoadingChange?.(b)
  }, [onLoadingChange])

  const handleClick = useCallback(async () => {
    if (disabled || loading) return
    setBusy(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      toast.error('Sign-in failed — try again')
      setBusy(false)
    }
  }, [disabled, loading, setBusy])

  return (
    <button type="button" disabled={disabled || loading} onClick={handleClick} className={visibleBtnCls}>
      <GoogleIcon />
      {loading ? 'Redirecting…' : 'Continue with Google'}
    </button>
  )
}
