"use client"

import { PhoneFrame } from '@/components/layout/phone-frame'
import { ByteAILogo } from '@/components/layout/byteai-logo'
import { UnifiedAuthForm } from './unified-auth-form'

export function AuthScreen() {
  return (
    <PhoneFrame>
      <div className="flex-1 overflow-y-auto relative">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute inset-[-100%] animate-gridpan"
            style={{
              backgroundImage:
                'linear-gradient(rgba(59,130,246,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.055) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
              maskImage: 'radial-gradient(ellipse 90% 90% at 50% 40%, black 0%, transparent 72%)',
              transform: 'rotate(-3deg)',
            }}
          />
          <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[340px] h-[340px] bg-[radial-gradient(circle,rgba(59,130,246,0.14)_0%,rgba(167,139,250,0.06)_50%,transparent_70%)] animate-pulse-glow blur-sm" />
        </div>

        <div className="relative z-10 p-7 flex flex-col gap-[20px]">
          {/* Brand */}
          <div className="flex flex-col items-center gap-[10px] text-center animate-fadeup" style={{ animationDelay: '0.05s' }}>
            <ByteAILogo size="lg" showText={false} />
            <h1 className="text-[28px] font-extrabold tracking-tight leading-tight">
              Welcome to <span className="text-[var(--accent)] drop-shadow-[0_0_24px_rgba(59,130,246,0.4)]">ByteAI</span>
            </h1>
            <p className="font-mono text-[10px] tracking-[0.18em] uppercase">
              <span className="text-[var(--t2)]">THE KNOWLEDGE LAYER FOR </span>
              <span className="text-[var(--accent)] opacity-90">TECH PROFESSIONALS</span>
            </p>
          </div>

          {/* Context copy */}
          <div
            className="flex flex-col gap-[8px] text-center animate-fadeup"
            style={{ animationDelay: '0.1s' }}
          >
            <p className="text-xs text-[var(--t2)] leading-relaxed">
              <span className="underline underline-offset-2 decoration-[var(--t3)]">Job postings</span>
              {'. '}
              <span className="underline underline-offset-2 decoration-[var(--t3)]">Random videos</span>
              {'. '}
              <span className="underline underline-offset-2 decoration-[var(--t3)]">Dank memes</span>
              {'. '}
              <span className="underline underline-offset-2 decoration-[var(--t3)]">Content you never asked for</span>
              {'. '}
              <span className="text-[var(--t1)] font-medium">If that sounds like your feed — you&apos;re in the right place.</span>
            </p>
            <p className="text-xs text-[var(--t2)] leading-relaxed">
              ByteAI is strictly tech — knowledge, insights, and real interview experiences,{' '}
              <span className="text-[var(--t1)]">shared by people who&apos;ve been there.</span>
            </p>
          </div>

          <UnifiedAuthForm />
        </div>
      </div>
    </PhoneFrame>
  )
}
