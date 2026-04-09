"use client"

import { useState } from 'react'
import { PhoneFrame } from '@/components/layout/phone-frame'
import { ByteAILogo } from '@/components/layout/byteai-logo'
import { useAuth } from '@/hooks/use-auth'
import { LoginForm } from './login-form'
import { SignupForm } from './signup-form'

type AuthTab = 'login' | 'signup'

export function AuthScreen() {
  const [activeTab, setActiveTab] = useState<AuthTab>('login')
  const { login } = useAuth()

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

        <div className="relative z-10 p-7 flex flex-col gap-[18px]">
          {/* Brand */}
          <div className="flex flex-col items-center gap-[10px] text-center animate-fadeup" style={{ animationDelay: '0.05s' }}>
            <ByteAILogo size="lg" showText={false} />
            <h1 className="text-[26px] font-extrabold tracking-tight leading-tight">
              Welcome to <span className="text-[var(--accent)] drop-shadow-[0_0_24px_rgba(59,130,246,0.4)]">ByteAI</span>
            </h1>
            <p className="font-mono text-[9px] tracking-[0.14em] text-[var(--t2)]">// THE SOCIAL LAYER FOR AI DEVS</p>
          </div>

          {/* Tab switcher */}
          <div
            className="flex gap-0.5 bg-[var(--bg-card)] border border-[var(--border-m)] rounded-[10px] p-[3px] animate-fadeup"
            style={{ animationDelay: '0.12s' }}
          >
            {(['login', 'signup'] as AuthTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-[9px] text-center rounded-lg font-mono text-[9px] font-semibold tracking-[0.08em] transition-all ${
                  activeTab === tab
                    ? 'text-white bg-[var(--accent)] shadow-[0_2px_12px_var(--accent-glow)]'
                    : 'text-[var(--t2)] hover:text-[var(--t1)] hover:bg-[var(--bg-el)]'
                }`}
              >
                {tab === 'login' ? 'SIGN_IN' : 'REGISTER'}
              </button>
            ))}
          </div>

          {activeTab === 'login' ? (
            <LoginForm onComplete={login} />
          ) : (
            <SignupForm onComplete={login} />
          )}
        </div>
      </div>
    </PhoneFrame>
  )
}
