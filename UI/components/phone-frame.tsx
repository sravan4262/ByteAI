"use client"

import Link from 'next/link'
import type { ReactNode } from 'react'

interface PhoneFrameProps {
  children: ReactNode
}

export function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div className="relative w-full h-full bg-[var(--bg)] overflow-hidden flex flex-col">
      {/* Body */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}

export function Header({ 
  title = 'BYTEAI', 
  rightContent 
}: { 
  title?: string
  rightContent?: ReactNode 
}) {
  return (
    <header className="flex items-center justify-between px-4 py-3 md:px-8 lg:px-12 xl:px-16 border-b border-[var(--border)] flex-shrink-0 bg-[rgba(5,5,14,0.92)] backdrop-blur-md">
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="font-mono text-[10px] md:text-xs text-[var(--cyan)] border-[1.5px] border-[var(--cyan)] rounded px-[6px] py-[3px] tracking-[0.05em] shadow-[0_0_10px_var(--cyan),0_0_20px_rgba(34,211,238,0.3),inset_0_0_8px_rgba(34,211,238,0.06)]">
          {'</>'}
        </span>
        <span className="font-mono text-sm md:text-base font-bold tracking-[0.1em]">{title}</span>
      </div>
      {rightContent}
    </header>
  )
}

export function Avatar({ 
  initials, 
  size = 'xs',
  variant = 'cyan'
}: { 
  initials: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  variant?: 'cyan' | 'purple' | 'green' | 'orange'
}) {
  const sizeClasses = {
    xs: 'w-8 h-8 text-[8px] md:w-9 md:h-9 md:text-[9px]',
    sm: 'w-10 h-10 text-[11px] md:w-11 md:h-11 md:text-xs',
    md: 'w-12 h-12 text-xs md:w-14 md:h-14 md:text-sm',
    lg: 'w-16 h-16 text-lg md:w-20 md:h-20 md:text-xl',
  }
  
  const variantClasses = {
    cyan: 'bg-gradient-to-br from-[#131b40] to-[#1e3580] text-[var(--cyan)]',
    purple: 'bg-gradient-to-br from-[#1e1040] to-[#3a1a90] text-[var(--purple)]',
    green: 'bg-gradient-to-br from-[#0a1e14] to-[#145840] text-[var(--green)]',
    orange: 'bg-gradient-to-br from-[#1a1040] to-[#2a1880] text-[var(--orange)]',
  }
  
  return (
    <div className={`${sizeClasses[size]} ${variantClasses[variant]} rounded-full border-[1.5px] border-[var(--border-h)] flex items-center justify-center font-mono font-bold flex-shrink-0 transition-all hover:scale-105 hover:shadow-[0_0_16px_rgba(34,211,238,0.2)]`}>
      {initials}
    </div>
  )
}

export function BottomNav({ 
  active,
}: { 
  active: 'feed' | 'interviews' | 'search' | 'post' | 'profile'
}) {
  const tabs = [
    { id: 'feed', icon: '⌂', label: 'KTS', href: '/feed' },
    { id: 'interviews', icon: '💼', label: 'INTERVIEWS', href: '/interviews' },
    { id: 'search', icon: '🔍', label: 'SEARCH', href: '/search' },
    { id: 'post', icon: '+', label: 'POST', href: '/compose' },
    { id: 'profile', icon: '👤', label: 'PROFILE', href: '/profile' },
  ]
  
  return (
    <nav className="flex flex-col border-r border-[var(--border)] bg-[rgba(5,5,14,0.98)] backdrop-blur-xl flex-shrink-0 h-full w-20 md:w-24 items-center gap-2 py-4">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={`flex flex-col items-center gap-1 py-2 px-2 transition-all relative w-full hover:-translate-y-px group rounded-lg ${
            active === tab.id ? 'bg-[rgba(59,130,246,0.1)]' : ''
          }`}
          title={tab.label}
        >
          {active === tab.id && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)]" />
          )}
          <span className={`text-lg md:text-xl transition-all ${
            active === tab.id 
              ? 'opacity-100 drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]' 
              : 'opacity-40 group-hover:opacity-60'
          }`}>
            {tab.icon}
          </span>
        </Link>
      ))}
    </nav>
  )
}
