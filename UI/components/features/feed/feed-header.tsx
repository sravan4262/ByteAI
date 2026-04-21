"use client"

import Link from 'next/link'
import { Bell, Zap } from 'lucide-react'
import { Avatar } from '@/components/layout/avatar'

import { useNotifications } from '@/components/layout/notification-context'
import { getMeCache } from '@/lib/user-cache'

interface FeedHeaderProps {
  contentType: 'bytes' | 'interviews'
}

export function FeedHeader({ contentType }: FeedHeaderProps) {
  const { openNotifications, unreadCount } = useNotifications()
  const cache = getMeCache()

  const initials = (cache?.displayName?.[0] ?? cache?.username?.[0] ?? '?').toUpperCase()
  const avatarSrc = cache?.avatarUrl ?? null
  const isEmoji = avatarSrc && !avatarSrc.startsWith('http')

  const isInterviews = contentType === 'interviews'

  return (
    <header className={`flex items-center justify-between px-4 py-3 md:py-4 border rounded-xl mx-3 mt-3 flex-shrink-0 backdrop-blur-md ${
      isInterviews
        ? 'border-[rgba(167,139,250,0.35)] bg-[rgba(167,139,250,0.07)]'
        : 'border-[rgba(59,130,246,0.35)] bg-[rgba(59,130,246,0.07)]'
    }`}>
      <div className="w-full flex items-center justify-between">
        <div>
          <h1 className="font-mono text-sm md:text-base lg:text-lg font-bold tracking-[0.07em] flex items-center gap-2">
            <Zap size={14} className="text-[var(--accent)]" />
            {contentType === 'interviews' ? 'INTERVIEWS' : 'BITS'}
          </h1>
          <div className="font-mono text-[10px] md:text-xs tracking-[0.08em] text-[var(--t1)] mt-0.5">
            {contentType === 'interviews' ? 'REAL QUESTIONS · REAL ANSWERS · ACE YOUR NEXT ROUND' : 'SHORT · INSIGHTS · LEARN.'}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openNotifications}
            className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[var(--bg-el)] flex items-center justify-center relative transition-all ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-card)] shadow-[0_0_10px_rgba(59,130,246,0.35)] hover:shadow-[0_0_16px_rgba(59,130,246,0.55)]"
          >
            <Bell size={16} className="text-[var(--accent)]" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--accent)] rounded-full border-[1.5px] border-[var(--bg)] shadow-[0_0_5px_var(--accent)]" />
            )}
          </button>
          <Link href="/profile">
            {isEmoji
              ? <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[var(--bg-el)] flex items-center justify-center text-xl ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-card)] transition-all">{avatarSrc}</div>
              : avatarSrc
                ? <img src={avatarSrc} referrerPolicy="no-referrer" alt="profile" className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-card)] hover:ring-[var(--accent-h,#60a5fa)] transition-all" />
                : <Avatar initials={initials} size="sm" />
            }
          </Link>
        </div>
      </div>
    </header>
  )
}
