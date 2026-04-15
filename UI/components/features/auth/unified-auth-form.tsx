"use client"

import { useState, useEffect } from 'react'
import { useSignIn, useSignUp, useAuth, useClerk } from '@clerk/nextjs'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Github } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { GoogleIcon } from './google-icon'

const emailSchema = z.object({ email: z.string().email('Enter a valid email') })
type EmailData = z.infer<typeof emailSchema>

type Step = 'input' | 'verify'
type Flow = 'signin' | 'signup'

const inputClass =
  'w-full bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg py-[13px] px-[14px] font-mono text-sm text-[var(--t1)] outline-none transition-all placeholder:text-[var(--t3)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.14)]'
const primaryBtn =
  'w-full py-[14px] bg-gradient-to-br from-[var(--accent)] to-[#2563eb] rounded-lg font-mono text-sm font-bold tracking-[0.1em] text-white shadow-[0_4px_24px_var(--accent-glow)] transition-all hover:shadow-[0_8px_36px_var(--accent-glow)] hover:-translate-y-0.5 disabled:opacity-50'
const socialBtn =
  'flex items-center justify-center gap-[9px] py-[14px] px-2 border border-[var(--border-m)] rounded-lg bg-[var(--bg-el)] font-mono text-sm font-semibold tracking-[0.04em] text-[var(--t1)] transition-all hover:border-[var(--border-h)] hover:bg-[var(--bg-card)] hover:-translate-y-px disabled:opacity-50'

export function UnifiedAuthForm() {
  const { signIn, isLoaded: signInLoaded } = useSignIn()
  const { signUp, isLoaded: signUpLoaded } = useSignUp()
  const { isSignedIn } = useAuth()
  const { client, setActive } = useClerk()
  const router = useRouter()

  const [step, setStep] = useState<Step>('input')
  const [flow, setFlow] = useState<Flow>('signin')
  const [isLoading, setIsLoading] = useState(false)
  const [otp, setOtp] = useState('')
  const isLoaded = signInLoaded && signUpLoaded

  useEffect(() => {
    if (isSignedIn) router.replace('/onboarding-check')
  }, [isSignedIn, router])

  const form = useForm<EmailData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  })

  const reuseActiveSession = async (): Promise<boolean> => {
    const sessions = client?.activeSessions ?? []
    if (sessions.length === 0) return false
    try {
      await setActive({ session: sessions[0].id })
      router.replace('/onboarding-check')
      return true
    } catch {
      return false
    }
  }

  const handleOAuth = async (strategy: 'oauth_google' | 'oauth_github') => {
    if (!isLoaded) return
    setIsLoading(true)
    if (await reuseActiveSession()) return
    try {
      await signIn!.authenticateWithRedirect({
        strategy,
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/onboarding-check',
      })
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { code: string }[] }
      const code = clerkErr?.errors?.[0]?.code ?? ''
      if (code === 'session_exists' || code === 'identifier_already_signed_in') {
        await reuseActiveSession()
      } else {
        toast.error('Auth failed — try again')
        setIsLoading(false)
      }
    }
  }

  const handleSendOtp = form.handleSubmit(async ({ email }) => {
    if (!isLoaded) return
    setIsLoading(true)
    if (await reuseActiveSession()) return
    try {
      // Try sign-in first (existing user)
      await signIn!.create({ strategy: 'email_code', identifier: email })
      setFlow('signin')
      setStep('verify')
      toast.success('Code sent — check your inbox')
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { code: string; message: string }[] }
      const code = clerkErr?.errors?.[0]?.code ?? ''

      if (code === 'form_identifier_not_found') {
        // New user — fall back to sign-up
        try {
          await signUp!.create({ emailAddress: email })
          await signUp!.prepareEmailAddressVerification({ strategy: 'email_code' })
          setFlow('signup')
          setStep('verify')
          toast.success('Code sent — check your inbox')
        } catch (signUpErr: unknown) {
          const e = signUpErr as { errors?: { message: string }[] }
          toast.error(e?.errors?.[0]?.message ?? 'Failed to send code')
        }
      } else if (code === 'session_exists' || code === 'identifier_already_signed_in') {
        await reuseActiveSession()
      } else {
        toast.error(clerkErr?.errors?.[0]?.message ?? 'Failed to send code')
      }
    } finally {
      setIsLoading(false)
    }
  })

  const handleVerify = async () => {
    if (!isLoaded || otp.length < 6) return
    setIsLoading(true)
    try {
      if (flow === 'signin') {
        const result = await signIn!.attemptFirstFactor({ strategy: 'email_code', code: otp })
        if (result.status === 'complete') {
          await setActive({ session: result.createdSessionId })
          router.replace('/onboarding-check')
        }
      } else {
        const result = await signUp!.attemptEmailAddressVerification({ code: otp })
        if (result.status === 'complete') {
          await setActive({ session: result.createdSessionId })
          router.replace('/onboarding-check')
        }
      }
    } catch {
      toast.error('Invalid code — try again')
      setOtp('')
    } finally {
      setIsLoading(false)
    }
  }

  if (step === 'verify') {
    return (
      <div className="flex flex-col gap-3 animate-fadeup">
        <p className="font-mono text-xs text-[var(--t2)]">
          // ENTER THE 6-DIGIT CODE FROM YOUR INBOX
        </p>
        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-xs tracking-[0.1em] text-[var(--t2)] flex items-center gap-[5px]">
            <span className="text-[var(--t3)]">//</span> VERIFICATION_CODE
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className={inputClass}
            autoFocus
          />
        </div>
        <button onClick={handleVerify} disabled={isLoading || otp.length < 6} className={primaryBtn}>
          {isLoading ? 'VERIFYING...' : 'VERIFY →'}
        </button>
        <button
          onClick={() => { setStep('input'); setOtp('') }}
          className="font-mono text-xs text-[var(--t3)] hover:text-[var(--t2)] text-center transition-colors"
        >
          ← BACK
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[13px] animate-fadeup" style={{ animationDelay: '0.2s' }}>
      {/* Required by Clerk for Smart CAPTCHA bot protection in custom flows */}
      <div id="clerk-captcha" />

      {/* OAuth buttons */}
      <div className="flex flex-col gap-2">
        <button onClick={() => handleOAuth('oauth_google')} disabled={isLoading} className={socialBtn}>
          <GoogleIcon /> Continue with Google
        </button>
        <button onClick={() => handleOAuth('oauth_github')} disabled={isLoading} className={socialBtn}>
          <Github size={17} /> Continue with GitHub
        </button>
      </div>

      <div className="flex items-center gap-[10px]">
        <div className="flex-1 h-px bg-[var(--border-m)]" />
        <span className="font-mono text-xs text-[var(--t3)]">// OR CONTINUE WITH EMAIL</span>
        <div className="flex-1 h-px bg-[var(--border-m)]" />
      </div>

      <form onSubmit={handleSendOtp} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-xs tracking-[0.1em] text-[var(--t2)] flex items-center gap-[5px]">
            <span className="text-[var(--t3)]">//</span> EMAIL_ADDRESS
          </label>
          <input
            type="email"
            {...form.register('email')}
            placeholder="you@domain.dev"
            className={inputClass}
          />
          {form.formState.errors.email && (
            <span className="font-mono text-xs text-[var(--red)]">
              {form.formState.errors.email.message}
            </span>
          )}
        </div>
        <button type="submit" disabled={isLoading} className={primaryBtn}>
          {isLoading ? 'SENDING...' : 'SEND CODE →'}
        </button>
      </form>

      <p className="font-mono text-xs text-[var(--t3)] text-center leading-relaxed">
        {"We'll send a one-time code — no password needed. By continuing, you agree to our "}
        <span className="text-[var(--t2)] cursor-pointer hover:text-[var(--accent)]">Terms</span>
        {' & '}
        <span className="text-[var(--t2)] cursor-pointer hover:text-[var(--accent)]">Privacy</span>.
      </p>
    </div>
  )
}
