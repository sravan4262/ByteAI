"use client"

import Script from 'next/script'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { GoogleIcon } from './google-icon'

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const GIS_SRC = 'https://accounts.google.com/gsi/client'

// Google's button is rendered transparently and laid over our styled button so
// the user sees the ByteAI design but the click is handled by Google's own
// FedCM-enabled GIS button (gives us reliable popup behavior + the credential).
const containerCls = 'relative w-full'
const visibleBtnCls =
  'flex w-full items-center justify-center gap-[9px] py-[14px] px-2 border border-[rgba(59,130,246,0.2)] rounded-lg bg-[rgba(59,130,246,0.03)] font-mono text-sm font-semibold tracking-[0.04em] text-[var(--t1)] transition-all hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:-translate-y-px disabled:opacity-50'
const overlayCls = 'absolute inset-0 opacity-0 [&>div]:!w-full [&>div>div]:!w-full'

interface Props {
  disabled?: boolean
  onLoadingChange?: (loading: boolean) => void
}

export function GoogleSignInButton({ disabled, onLoadingChange }: Props) {
  const router = useRouter()
  const overlayRef = useRef<HTMLDivElement>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [loading, setLoading] = useState(false)

  const setBusy = useCallback((b: boolean) => {
    setLoading(b)
    onLoadingChange?.(b)
  }, [onLoadingChange])

  // Hash a random nonce — the raw nonce goes to Supabase, the SHA-256 hash to
  // Google. Supabase verifies the ID token's `nonce` claim equals SHA-256(raw).
  const generateNonce = useCallback(async (): Promise<{ raw: string; hashed: string }> => {
    const raw = crypto.randomUUID() + crypto.randomUUID()
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
    const hashed = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    return { raw, hashed }
  }, [])

  useEffect(() => {
    if (!scriptLoaded || !overlayRef.current || !window.google?.accounts?.id) return

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) {
      console.error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set')
      return
    }

    let active = true

    generateNonce().then((nonce) => {
      if (!active) return

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: { credential: string }) => {
          setBusy(true)
          const { error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: response.credential,
            nonce: nonce.raw,
          })
          if (error) {
            toast.error('Sign-in failed — try again')
            setBusy(false)
            return
          }
          router.replace('/onboarding-check')
        },
        nonce: nonce.hashed,
        use_fedcm_for_prompt: false,
        ux_mode: 'popup',
        auto_select: false,
        itp_support: true,
      })

      window.google.accounts.id.renderButton(overlayRef.current!, {
        type: 'standard',
        theme: 'filled_black',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'center',
      })
    })

    return () => { active = false }
  }, [scriptLoaded, generateNonce, router, setBusy])

  return (
    <>
      <Script src={GIS_SRC} strategy="afterInteractive" onLoad={() => setScriptLoaded(true)} />
      <div className={containerCls}>
        <button type="button" disabled={disabled || loading} className={visibleBtnCls}>
          <GoogleIcon />
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>
        <div ref={overlayRef} className={overlayCls} aria-hidden />
      </div>
    </>
  )
}
