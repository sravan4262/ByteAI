"use client"

import { useState, useEffect } from 'react'
import { useSignUp, useClerk } from '@clerk/nextjs'
import { useAuth } from '@clerk/nextjs'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Github } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { signupEmailSchema, type SignupEmailData } from '@/lib/schemas'
import { GoogleIcon } from './google-icon'

type Method = 'google' | 'github' | 'email'
type Step = 'input' | 'verify'

export function SignupForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { signUp, isLoaded } = useSignUp()
  const { isSignedIn } = useAuth()
  const { client, setActive } = useClerk()
  const router = useRouter()
  const [method, setMethod] = useState<Method>('email')

  // Already signed in — skip straight to onboarding-check
  useEffect(() => {
    if (isSignedIn) {
      router.replace('/onboarding-check')
    }
  }, [isSignedIn, router])
  const [step, setStep] = useState<Step>('input')
  const [isLoading, setIsLoading] = useState(false)
  const [otp, setOtp] = useState('')

  const form = useForm<SignupEmailData>({
    resolver: zodResolver(signupEmailSchema),
    defaultValues: { firstName: '', lastName: '', username: '', email: '' },
  })
  const username = form.watch('username')

  // If a session already exists, activate it instead of starting a new sign-up/sign-in
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
      await signUp.authenticateWithRedirect({
        strategy,
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/onboarding-check',
      })
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { code: string; message: string }[] }
      const code = clerkErr?.errors?.[0]?.code ?? ''
      if (code === 'session_exists' || code === 'identifier_already_signed_in') {
        await reuseActiveSession()
      } else {
        toast.error('Sign up failed — try again')
        setIsLoading(false)
      }
    }
  }

  const handleEmailSignup = form.handleSubmit(async ({ firstName, lastName, username, email }) => {
    if (!isLoaded) return
    setIsLoading(true)
    try {
      await signUp.create({ firstName, lastName, emailAddress: email, username })
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setStep('verify')
      toast.success('Code sent — check your inbox')
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { code: string; message: string }[] }
      const code = clerkErr?.errors?.[0]?.code ?? ''
      // Clerk returns this code when the email already has an account
      if (code === 'form_identifier_exists' || code === 'identifier_already_signed_in') {
        toast.error('An account already exists with this email — please sign in', { duration: 5000 })
        onSwitchToLogin()
      } else {
        toast.error(clerkErr?.errors?.[0]?.message ?? 'Signup failed')
      }
    } finally {
      setIsLoading(false)
    }
  })

  const handleVerify = async () => {
    if (!isLoaded || otp.length < 6) return
    setIsLoading(true)
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: otp })
      if (result.status === 'complete') {
        // Activate the new session before navigating
        await setActive({ session: result.createdSessionId })
        router.replace('/onboarding')
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
  const labelClass =
    'font-mono text-[10px] tracking-[0.1em] text-[var(--t2)] flex items-center gap-[5px]'
  const errorClass = 'font-mono text-[10px] text-[var(--red)]'
  const primaryBtn =
    'w-full py-[13px] bg-gradient-to-br from-[var(--accent)] to-[#2563eb] rounded-lg font-mono text-xs font-bold tracking-[0.1em] text-white shadow-[0_4px_24px_var(--accent-glow)] transition-all hover:shadow-[0_8px_36px_var(--accent-glow)] hover:-translate-y-0.5 disabled:opacity-50'

  // OTP verify step
  if (step === 'verify') {
    return (
      <div className="flex flex-col gap-3 animate-fadeup">
        <p className="font-mono text-[10px] text-[var(--t2)]">
          // ENTER THE 6-DIGIT CODE FROM YOUR INBOX
        </p>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>
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
    <div className="flex flex-col gap-3 animate-fadeup" style={{ animationDelay: '0.2s' }}>
      {/* Required by Clerk for Smart CAPTCHA bot protection in custom flows */}
      <div id="clerk-captcha" />
      <p className="font-mono text-xs text-[var(--t2)] tracking-[0.07em]">// CHOOSE HOW TO REGISTER</p>

      {/* Method selector */}
      <div className="grid grid-cols-3 gap-2">
        {(['google', 'github', 'email'] as Method[]).map((m) => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className={`flex flex-col items-center gap-1.5 py-[14px] px-2 border-[1.5px] rounded-lg bg-[var(--bg-card)] font-mono text-[10px] tracking-[0.05em] transition-all hover:border-[var(--border-h)] hover:text-[var(--t1)] hover:-translate-y-0.5 ${
              method === m
                ? m === 'email'
                  ? 'border-[var(--accent)] bg-[var(--accent-d)] text-[var(--accent)]'
                  : 'border-[var(--border-h)] bg-[var(--bg-el)] text-[var(--t1)]'
                : 'border-[var(--border-m)] text-[var(--t2)]'
            }`}
          >
            <span className="text-xl leading-none">
              {m === 'email' && '✉'}
              {m === 'google' && <GoogleIcon />}
              {m === 'github' && <Github size={20} />}
            </span>
            {m === 'email' ? 'EMAIL' : m === 'google' ? 'GOOGLE' : 'GITHUB'}
          </button>
        ))}
      </div>

      {/* OAuth continue button */}
      {(method === 'google' || method === 'github') && (
        <button
          onClick={() => handleOAuth(method === 'google' ? 'oauth_google' : 'oauth_github')}
          disabled={isLoading}
          className="w-full py-[14px] border border-[var(--border-m)] rounded-lg bg-[var(--bg-el)] font-mono text-xs font-bold tracking-[0.07em] text-[var(--t1)] transition-all hover:border-[var(--border-h)] hover:-translate-y-px flex items-center justify-center gap-[10px] disabled:opacity-50"
        >
          {method === 'google'
            ? <><GoogleIcon /> CONTINUE WITH GOOGLE</>
            : <><Github size={16} /> CONTINUE WITH GITHUB</>}
        </button>
      )}

      {/* Email OTP signup form */}
      {method === 'email' && (
        <form onSubmit={handleEmailSignup} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-[10px]">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}><span className="text-[var(--t3)]">//</span> FIRST</label>
              <input type="text" {...form.register('firstName')} placeholder="Alex" className={inputClass} />
              {form.formState.errors.firstName && (
                <span className={errorClass}>{form.formState.errors.firstName.message}</span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}><span className="text-[var(--t3)]">//</span> LAST</label>
              <input type="text" {...form.register('lastName')} placeholder="Xu" className={inputClass} />
              {form.formState.errors.lastName && (
                <span className={errorClass}>{form.formState.errors.lastName.message}</span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}><span className="text-[var(--t3)]">//</span> USERNAME</label>
            <input type="text" {...form.register('username')} placeholder="@yourhandle" className={inputClass} />
            {form.formState.errors.username ? (
              <span className={errorClass}>{form.formState.errors.username.message}</span>
            ) : username && username.length >= 3 ? (
              <div className="font-mono text-[10px] text-[var(--green)] flex items-center gap-1">
                <span className="animate-blink">●</span> USERNAME AVAILABLE
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}><span className="text-[var(--t3)]">//</span> EMAIL_ADDRESS</label>
            <input type="email" {...form.register('email')} placeholder="you@domain.dev" className={inputClass} />
            {form.formState.errors.email && (
              <span className={errorClass}>{form.formState.errors.email.message}</span>
            )}
          </div>
          <button type="submit" disabled={isLoading} className={primaryBtn}>
            {isLoading ? 'SENDING...' : 'SEND_OTP →'}
          </button>
        </form>
      )}

      <p className="font-mono text-[10px] text-[var(--t3)] text-center leading-relaxed">
        {method !== 'email'
          ? `A ByteAI account will be created using your ${method === 'google' ? 'Google' : 'GitHub'} profile. `
          : "We'll email you a one-time code to verify. "}
        <span className="text-[var(--t2)] cursor-pointer hover:text-[var(--accent)]">Terms</span> &{' '}
        <span className="text-[var(--t2)] cursor-pointer hover:text-[var(--accent)]">Privacy</span>.
      </p>
    </div>
  )
}
