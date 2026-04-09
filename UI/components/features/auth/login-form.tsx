"use client"

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Smartphone } from 'lucide-react'
import { loginEmailSchema, loginPhoneSchema, type LoginEmailData, type LoginPhoneData } from '@/lib/schemas'
import { GoogleIcon } from './google-icon'
import * as api from '@/lib/api'

interface LoginFormProps {
  onComplete: () => void
}

type LoginMethod = 'email' | 'phone'

export function LoginForm({ onComplete }: LoginFormProps) {
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email')
  const [isLoading, setIsLoading] = useState(false)

  const emailForm = useForm<LoginEmailData>({
    resolver: zodResolver(loginEmailSchema),
    defaultValues: { email: '' },
  })

  const phoneForm = useForm<LoginPhoneData>({
    resolver: zodResolver(loginPhoneSchema),
    defaultValues: { countryCode: '+1', phone: '' },
  })

  const handleEmailLogin = emailForm.handleSubmit(async (data) => {
    setIsLoading(true)
    try {
      await api.loginWithEmail(data.email)
      toast.success('OTP sent — check your inbox')
      onComplete()
    } catch {
      toast.error('Failed to send OTP')
    } finally {
      setIsLoading(false)
    }
  })

  const handlePhoneLogin = phoneForm.handleSubmit(async (data) => {
    setIsLoading(true)
    try {
      await api.loginWithPhone(data.countryCode, data.phone)
      toast.success('OTP sent via SMS')
      onComplete()
    } catch {
      toast.error('Failed to send OTP')
    } finally {
      setIsLoading(false)
    }
  })

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setIsLoading(true)
    try {
      if (provider === 'google') await api.loginWithGoogle()
      else await api.loginWithFacebook()
      onComplete()
    } catch {
      toast.error(`${provider} login failed`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-[13px] animate-fadeup" style={{ animationDelay: '0.2s' }}>
      {/* Social buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleSocialLogin('google')}
          disabled={isLoading}
          className="flex items-center justify-center gap-[7px] py-[11px] px-2 border border-[var(--border-m)] rounded-lg bg-[var(--bg-el)] font-mono text-[11px] tracking-[0.04em] text-[var(--t2)] transition-all hover:border-[var(--border-h)] hover:text-[var(--t1)] hover:-translate-y-px disabled:opacity-50"
        >
          <GoogleIcon /> GOOGLE
        </button>
        <button
          onClick={() => handleSocialLogin('facebook')}
          disabled={isLoading}
          className="flex items-center justify-center gap-[7px] py-[11px] px-2 border border-[var(--border-m)] rounded-lg bg-[var(--bg-el)] font-mono text-[11px] tracking-[0.04em] text-[var(--t2)] transition-all hover:border-[#1877f2] hover:text-[#1877f2] hover:bg-[rgba(24,119,242,0.07)] disabled:opacity-50"
        >
          <span className="text-[15px]">𝑓</span> FACEBOOK
        </button>
        <button
          onClick={() => setLoginMethod(loginMethod === 'phone' ? 'email' : 'phone')}
          className="col-span-2 flex items-center justify-center gap-[7px] py-[11px] px-2 border border-[var(--border-m)] rounded-lg bg-[var(--bg-el)] font-mono text-[11px] tracking-[0.04em] text-[var(--t2)] transition-all hover:border-[var(--green)] hover:text-[var(--green)] hover:bg-[var(--green-d)]"
        >
          <Smartphone size={14} />
          {loginMethod === 'phone' ? 'USE EMAIL INSTEAD' : 'CONTINUE WITH PHONE'}
        </button>
      </div>

      <div className="flex items-center gap-[10px]">
        <div className="flex-1 h-px bg-[var(--border-m)]" />
        <span className="font-mono text-[10px] text-[var(--t3)]">
          {loginMethod === 'email' ? '// OR SIGN IN WITH EMAIL OTP' : '// ENTER YOUR PHONE'}
        </span>
        <div className="flex-1 h-px bg-[var(--border-m)]" />
      </div>

      {loginMethod === 'email' ? (
        <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] tracking-[0.1em] text-[var(--t2)] flex items-center gap-[5px]">
              <span className="text-[var(--t3)]">//</span> EMAIL_ADDRESS
            </label>
            <input
              type="email"
              {...emailForm.register('email')}
              placeholder="you@domain.dev"
              className="w-full bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg py-[11px] px-[14px] font-mono text-sm text-[var(--t1)] outline-none transition-all placeholder:text-[var(--t3)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.14)]"
            />
            {emailForm.formState.errors.email && (
              <span className="font-mono text-[10px] text-[var(--red)]">
                {emailForm.formState.errors.email.message}
              </span>
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
      ) : (
        <form onSubmit={handlePhoneLogin} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] tracking-[0.1em] text-[var(--t2)] flex items-center gap-[5px]">
              <span className="text-[var(--t3)]">//</span> PHONE_NUMBER
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                {...phoneForm.register('countryCode')}
                placeholder="+1"
                className="w-[72px] bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg py-[11px] px-[14px] font-mono text-sm text-[var(--t1)] outline-none transition-all focus:border-[var(--accent)]"
              />
              <input
                type="tel"
                {...phoneForm.register('phone')}
                placeholder="(555) 000-0000"
                className="flex-1 bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg py-[11px] px-[14px] font-mono text-sm text-[var(--t1)] outline-none transition-all focus:border-[var(--accent)]"
              />
            </div>
            {(phoneForm.formState.errors.phone || phoneForm.formState.errors.countryCode) && (
              <span className="font-mono text-[10px] text-[var(--red)]">
                {phoneForm.formState.errors.phone?.message || phoneForm.formState.errors.countryCode?.message}
              </span>
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

      <p className="font-mono text-[10px] text-[var(--t3)] text-center">
        {"We'll send you a one-time login code. No password needed."}
      </p>
    </div>
  )
}
