"use client"

import { useState } from 'react'
import { useSignIn } from '@clerk/nextjs'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Github } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { loginEmailSchema, type LoginEmailData } from '@/lib/schemas'
import { GoogleIcon } from './google-icon'

type Step = 'input' | 'verify'

export function LoginForm() {
  const { signIn, isLoaded } = useSignIn()
  const router = useRouter()
  const [step, setStep] = useState<Step>('input')
  const [isLoading, setIsLoading] = useState(false)
  const [otp, setOtp] = useState('')

  const form = useForm<LoginEmailData>({
    resolver: zodResolver(loginEmailSchema),
    defaultValues: { email: '' },
  })

  const handleOAuth = async (strategy: 'oauth_google' | 'oauth_github') => {
    if (!isLoaded) return
    setIsLoading(true)
    try {
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/onboarding-check',
      })
    } catch {
      toast.error('Sign in failed — try again')
      setIsLoading(false)
    }
  }

  const handleSendOtp = form.handleSubmit(async ({ email }) => {
    if (!isLoaded) return
    setIsLoading(true)
    try {
      await signIn.create({ strategy: 'email_code', identifier: email })
      setStep('verify')
      toast.success('Code sent — check your inbox')
    } catch {
      toast.error('Failed to send code')
    } finally {
      setIsLoading(false)
    }
  })

  const handleVerify = async () => {
    if (!isLoaded || otp.length < 6) return
    setIsLoading(true)
    try {
      const result = await signIn.attemptFirstFactor({ strategy: 'email_code', code: otp })
      if (result.status === 'complete') {
        router.push('/onboarding-check')
      }
    } catch {
      toast.error('Invalid code — try again')
      setOtp('')
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass =
    'w-full bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg py-[11px] px-[14px] font-mono text-sm text-[var(--t1)] outline-none transition-all placeholder:text-[var(--t3)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.14)]'
  const primaryBtn =
    'w-full py-[13px] bg-gradient-to-br from-[var(--accent)] to-[#2563eb] rounded-lg font-mono text-xs font-bold tracking-[0.1em] text-white shadow-[0_4px_24px_var(--accent-glow)] transition-all hover:shadow-[0_8px_36px_var(--accent-glow)] hover:-translate-y-0.5 disabled:opacity-50'
  const socialBtn =
    'flex items-center justify-center gap-[7px] py-[11px] px-2 border border-[var(--border-m)] rounded-lg bg-[var(--bg-el)] font-mono text-[11px] tracking-[0.04em] text-[var(--t2)] transition-all hover:border-[var(--border-h)] hover:text-[var(--t1)] hover:-translate-y-px disabled:opacity-50'

  if (step === 'verify') {
    return (
      <div className="flex flex-col gap-3 animate-fadeup">
        <p className="font-mono text-[10px] text-[var(--t2)]">
          // ENTER THE 6-DIGIT CODE FROM YOUR INBOX
        </p>
        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-[10px] tracking-[0.1em] text-[var(--t2)] flex items-center gap-[5px]">
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
          className="font-mono text-[10px] text-[var(--t3)] hover:text-[var(--t2)] text-center transition-colors"
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
      {/* Social buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => handleOAuth('oauth_google')} disabled={isLoading} className={socialBtn}>
          <GoogleIcon /> GOOGLE
        </button>
        <button onClick={() => handleOAuth('oauth_github')} disabled={isLoading} className={socialBtn}>
          <Github size={14} /> GITHUB
        </button>
      </div>

      <div className="flex items-center gap-[10px]">
        <div className="flex-1 h-px bg-[var(--border-m)]" />
        <span className="font-mono text-[10px] text-[var(--t3)]">// OR SIGN IN WITH EMAIL OTP</span>
        <div className="flex-1 h-px bg-[var(--border-m)]" />
      </div>

      <form onSubmit={handleSendOtp} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-[10px] tracking-[0.1em] text-[var(--t2)] flex items-center gap-[5px]">
            <span className="text-[var(--t3)]">//</span> EMAIL_ADDRESS
          </label>
          <input
            type="email"
            {...form.register('email')}
            placeholder="you@domain.dev"
            className={inputClass}
          />
          {form.formState.errors.email && (
            <span className="font-mono text-[10px] text-[var(--red)]">
              {form.formState.errors.email.message}
            </span>
          )}
        </div>
        <button type="submit" disabled={isLoading} className={primaryBtn}>
          {isLoading ? 'SENDING...' : 'SEND_OTP →'}
        </button>
      </form>

      <p className="font-mono text-[10px] text-[var(--t3)] text-center">
        {"We'll send you a one-time login code. No password needed."}
      </p>
    </div>
  )
}
