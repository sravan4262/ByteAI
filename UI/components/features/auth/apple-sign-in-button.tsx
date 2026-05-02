"use client"

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { AppleIcon } from './apple-icon'

const btnCls =
  'flex items-center justify-center gap-[9px] py-[12px] px-8 border border-[rgba(59,130,246,0.2)] rounded-lg bg-[rgba(59,130,246,0.03)] font-mono text-sm font-semibold tracking-[0.04em] text-[var(--t1)] transition-all hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:-translate-y-px disabled:opacity-50'

interface Props {
  disabled?: boolean
  onLoadingChange?: (loading: boolean) => void
  /** Safe relative path to redirect to after sign-in (validated upstream). */
  next?: string
}

export function AppleSignInButton({ disabled, onLoadingChange, next }: Props) {
  const [loading, setLoading] = useState(false)

  const setBusy = useCallback((b: boolean) => {
    setLoading(b)
    onLoadingChange?.(b)
  }, [onLoadingChange])

  const handleClick = useCallback(async () => {
    if (disabled || loading) return
    setBusy(true)
    const callback = new URL(`${window.location.origin}/auth/callback`)
    if (next) callback.searchParams.set('next', next)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: callback.toString() },
    })
    if (error) {
      toast.error('Sign-in failed — try again')
      setBusy(false)
    }
  }, [disabled, loading, setBusy, next])

  return (
    <button type="button" disabled={disabled || loading} onClick={handleClick} className={btnCls}>
      <AppleIcon />
      {loading ? 'Redirecting…' : 'Continue with Apple'}
    </button>
  )
}
