"use client"

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { signupEmailSchema, signupPhoneSchema, type SignupEmailData, type SignupPhoneData } from '@/lib/schemas'
import { GoogleIcon } from './google-icon'
import * as api from '@/lib/api'

type SignupMethod = 'email' | 'phone' | 'gmail' | 'fb'

interface SignupFormProps {
  onComplete: () => void
}

const METHOD_LABELS: Record<SignupMethod, string> = {
  email: 'EMAIL OTP',
  phone: 'PHONE',
  gmail: 'GOOGLE',
  fb: 'FACEBOOK',
}

export function SignupForm({ onComplete }: SignupFormProps) {
  const [signupMethod, setSignupMethod] = useState<SignupMethod>('email')
  const [isLoading, setIsLoading] = useState(false)

  const emailForm = useForm<SignupEmailData>({
    resolver: zodResolver(signupEmailSchema),
    defaultValues: { firstName: '', lastName: '', username: '', email: '' },
  })

  const phoneForm = useForm<SignupPhoneData>({
    resolver: zodResolver(signupPhoneSchema),
    defaultValues: { firstName: '', lastName: '', username: '', countryCode: '+1', phone: '' },
  })

  const username = emailForm.watch('username')

  const handleEmailSignup = emailForm.handleSubmit(async (data) => {
    setIsLoading(true)
    try {
      await api.signup({ firstName: data.firstName, lastName: data.lastName, username: data.username, email: data.email })
      toast.success('OTP sent — check your inbox')
      onComplete()
    } catch {
      toast.error('Signup failed')
    } finally {
      setIsLoading(false)
    }
  })

  const handlePhoneSignup = phoneForm.handleSubmit(async (data) => {
    setIsLoading(true)
    try {
      await api.signup({ firstName: data.firstName, lastName: data.lastName, username: data.username, phone: `${data.countryCode}${data.phone}` })
      toast.success('OTP sent via SMS')
      onComplete()
    } catch {
      toast.error('Signup failed')
    } finally {
      setIsLoading(false)
    }
  })

  const handleSocialSignup = async (provider: 'gmail' | 'fb') => {
    setIsLoading(true)
    try {
      if (provider === 'gmail') await api.loginWithGoogle()
      else await api.loginWithFacebook()
      onComplete()
    } catch {
      toast.error('Signup failed')
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass = 'w-full bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg py-[11px] px-[14px] font-mono text-sm text-[var(--t1)] outline-none transition-all placeholder:text-[var(--t3)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.14)]'
  const labelClass = 'font-mono text-[10px] tracking-[0.1em] text-[var(--t2)] flex items-center gap-[5px]'
  const errorClass = 'font-mono text-[10px] text-[var(--red)]'

  return (
    <div className="flex flex-col gap-3 animate-fadeup" style={{ animationDelay: '0.2s' }}>
      <p className="font-mono text-xs text-[var(--t2)] tracking-[0.07em]">// CHOOSE HOW TO REGISTER</p>

      {/* Method selector */}
      <div className="grid grid-cols-2 gap-2">
        {(['email', 'phone', 'gmail', 'fb'] as SignupMethod[]).map((method) => (
          <button
            key={method}
            onClick={() => setSignupMethod(method)}
            className={`flex flex-col items-center gap-1.5 py-[14px] px-2 border-[1.5px] rounded-lg bg-[var(--bg-card)] font-mono text-[10px] tracking-[0.05em] transition-all hover:border-[var(--border-h)] hover:text-[var(--t1)] hover:-translate-y-0.5 ${
              signupMethod === method
                ? method === 'email'
                  ? 'border-[var(--accent)] bg-[var(--accent-d)] text-[var(--accent)]'
                  : method === 'phone'
                  ? 'border-[var(--green)] bg-[var(--green-d)] text-[var(--green)]'
                  : method === 'gmail'
                  ? 'border-[var(--border-h)] bg-[var(--bg-el)] text-[var(--t1)]'
                  : 'border-[#1877f2] bg-[rgba(24,119,242,0.07)] text-[#1877f2]'
                : 'border-[var(--border-m)] text-[var(--t2)]'
            }`}
          >
            <span className="text-xl leading-none">
              {method === 'email' && '✉'}
              {method === 'phone' && '📱'}
              {method === 'gmail' && <GoogleIcon />}
              {method === 'fb' && '𝑓'}
            </span>
            {METHOD_LABELS[method]}
          </button>
        ))}
      </div>

      {/* Email signup form */}
      {signupMethod === 'email' && (
        <form onSubmit={handleEmailSignup} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-[10px]">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}><span className="text-[var(--t3)]">//</span> FIRST</label>
              <input type="text" {...emailForm.register('firstName')} placeholder="Alex" className={inputClass} />
              {emailForm.formState.errors.firstName && <span className={errorClass}>{emailForm.formState.errors.firstName.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}><span className="text-[var(--t3)]">//</span> LAST</label>
              <input type="text" {...emailForm.register('lastName')} placeholder="Xu" className={inputClass} />
              {emailForm.formState.errors.lastName && <span className={errorClass}>{emailForm.formState.errors.lastName.message}</span>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}><span className="text-[var(--t3)]">//</span> USERNAME</label>
            <input type="text" {...emailForm.register('username')} placeholder="@yourhandle" className={inputClass} />
            {emailForm.formState.errors.username ? (
              <span className={errorClass}>{emailForm.formState.errors.username.message}</span>
            ) : username && username.length >= 3 ? (
              <div className="font-mono text-[10px] text-[var(--green)] flex items-center gap-1">
                <span className="animate-blink">●</span> USERNAME AVAILABLE
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}><span className="text-[var(--t3)]">//</span> EMAIL_ADDRESS</label>
            <input type="email" {...emailForm.register('email')} placeholder="you@domain.dev" className={inputClass} />
            {emailForm.formState.errors.email && <span className={errorClass}>{emailForm.formState.errors.email.message}</span>}
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-[13px] bg-gradient-to-br from-[var(--accent)] to-[#2563eb] rounded-lg font-mono text-xs font-bold tracking-[0.1em] text-white shadow-[0_4px_24px_var(--accent-glow)] transition-all hover:shadow-[0_8px_36px_var(--accent-glow)] hover:-translate-y-0.5 disabled:opacity-50"
          >
            {isLoading ? 'SENDING...' : 'SEND_OTP →'}
          </button>
        </form>
      )}

      {/* Phone signup form */}
      {signupMethod === 'phone' && (
        <form onSubmit={handlePhoneSignup} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-[10px]">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}><span className="text-[var(--t3)]">//</span> FIRST</label>
              <input type="text" {...phoneForm.register('firstName')} placeholder="Alex" className={inputClass} />
              {phoneForm.formState.errors.firstName && <span className={errorClass}>{phoneForm.formState.errors.firstName.message}</span>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}><span className="text-[var(--t3)]">//</span> LAST</label>
              <input type="text" {...phoneForm.register('lastName')} placeholder="Xu" className={inputClass} />
              {phoneForm.formState.errors.lastName && <span className={errorClass}>{phoneForm.formState.errors.lastName.message}</span>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}><span className="text-[var(--t3)]">//</span> USERNAME</label>
            <input type="text" {...phoneForm.register('username')} placeholder="@yourhandle" className={inputClass} />
            {phoneForm.formState.errors.username && <span className={errorClass}>{phoneForm.formState.errors.username.message}</span>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}><span className="text-[var(--t3)]">//</span> PHONE_NUMBER</label>
            <div className="flex gap-2">
              <input type="text" {...phoneForm.register('countryCode')} placeholder="+1" className="w-[72px] bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg py-[11px] px-[14px] font-mono text-[11px] text-[var(--t1)] outline-none transition-all focus:border-[var(--accent)]" />
              <input type="tel" {...phoneForm.register('phone')} placeholder="(555) 000-0000" className="flex-1 bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg py-[11px] px-[14px] font-mono text-[11px] text-[var(--t1)] outline-none transition-all focus:border-[var(--accent)]" />
            </div>
            {(phoneForm.formState.errors.phone || phoneForm.formState.errors.countryCode) && (
              <span className={errorClass}>{phoneForm.formState.errors.phone?.message || phoneForm.formState.errors.countryCode?.message}</span>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-[13px] bg-gradient-to-br from-[var(--accent)] to-[#2563eb] rounded-lg font-mono text-xs font-bold tracking-[0.1em] text-white shadow-[0_4px_24px_var(--accent-glow)] transition-all hover:shadow-[0_8px_36px_var(--accent-glow)] hover:-translate-y-0.5 disabled:opacity-50"
          >
            {isLoading ? 'SENDING...' : 'SEND_OTP →'}
          </button>
        </form>
      )}

      {/* Social signup buttons */}
      {signupMethod === 'gmail' && (
        <button
          onClick={() => handleSocialSignup('gmail')}
          disabled={isLoading}
          className="w-full py-[14px] bg-white text-[#3c4043] border border-[#dadce0] rounded-lg font-mono text-xs font-bold tracking-[0.07em] shadow-[0_2px_12px_rgba(0,0,0,0.25)] transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.35)] hover:-translate-y-px flex items-center justify-center gap-[10px] disabled:opacity-50"
        >
          <GoogleIcon /> CONTINUE WITH GOOGLE
        </button>
      )}
      {signupMethod === 'fb' && (
        <button
          onClick={() => handleSocialSignup('fb')}
          disabled={isLoading}
          className="w-full py-[14px] bg-[#1877f2] text-white rounded-lg font-mono text-xs font-bold tracking-[0.07em] shadow-[0_4px_20px_rgba(24,119,242,0.4)] transition-all hover:shadow-[0_6px_28px_rgba(24,119,242,0.5)] hover:-translate-y-px flex items-center justify-center gap-[10px] disabled:opacity-50"
        >
          <span className="text-base font-bold">𝑓</span> CONTINUE WITH FACEBOOK
        </button>
      )}

      <p className="font-mono text-[10px] text-[var(--t3)] text-center leading-relaxed">
        {signupMethod === 'gmail' || signupMethod === 'fb'
          ? `A ByteAI account will be created using your ${signupMethod === 'gmail' ? 'Google' : 'Facebook'} profile. `
          : `We'll ${signupMethod === 'phone' ? 'send a one-time code via SMS' : 'email you a one-time code to verify'}. `}
        <span className="text-[var(--t2)] cursor-pointer hover:text-[var(--accent)]">Terms</span> &{' '}
        <span className="text-[var(--t2)] cursor-pointer hover:text-[var(--accent)]">Privacy</span>.
      </p>
    </div>
  )
}
