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

  const initials = ((user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '')).toUpperCase() || '?'
  // Prefer custom avatar from DB; fall back to provider photo
  const avatarSrc = cache?.avatarUrl || user?.imageUrl || null
  const isEmoji = avatarSrc && !avatarSrc.startsWith('http')

  return (
    <header className="flex items-center justify-between px-4 md:px-8 lg:px-12 xl:px-16 py-3 md:py-4 border-b border-[var(--border)] flex-shrink-0 bg-[var(--bg-o95)] backdrop-blur-md">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        <div>
          <h1 className="font-mono text-sm md:text-base lg:text-lg font-bold tracking-[0.07em] flex items-center gap-2">
            <Zap size={14} className="text-[var(--accent)]" />
            {contentType === 'interviews' ? 'INTERVIEWS' : 'BITS'}
          </h1>
          <div className="font-mono text-[10px] md:text-xs tracking-[0.08em] text-[var(--t2)] mt-0.5">
            DAILY INSIGHTS · BUILT BY AI DEVS · FOR AI DEVS
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openNotifications}
            className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[var(--bg-el)] border border-[var(--border-m)] flex items-center justify-center relative transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <Bell size={16} className="text-[var(--t2)]" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--accent)] rounded-full border-[1.5px] border-[var(--bg)] shadow-[0_0_5px_var(--accent)]" />
            )}
          </button>
          <Link href="/profile">
            {isEmoji
              ? <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[var(--bg-el)] border border-[var(--border-h)] flex items-center justify-center text-xl ring-1 ring-[var(--border-h)] hover:ring-[var(--accent)] transition-all">{avatarSrc}</div>
              : avatarSrc
                ? <img src={avatarSrc} referrerPolicy="no-referrer" alt="profile" className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover ring-1 ring-[var(--border-h)] hover:ring-[var(--accent)] transition-all" />
                : <Avatar initials={initials} size="sm" />
            }
          </Link>
        </div>
      </div>
    </header>
  )
}
