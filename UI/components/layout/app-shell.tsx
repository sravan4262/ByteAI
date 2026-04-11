"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Briefcase, Search, SquarePen, Bell } from 'lucide-react'
import { PhoneFrame } from '@/components/layout/phone-frame'
import { ByteAILogo } from '@/components/layout/byteai-logo'
import { NotificationPanel } from '@/components/features/notifications/notification-panel'
import { useEffect, useState } from 'react'
import { getUnreadNotificationCount } from '@/lib/api/client'
import type { ReactNode } from 'react'

const pathToActiveTab = (pathname: string) => {
  if (pathname.startsWith('/interviews')) return 'interviews'
  if (pathname.startsWith('/search')) return 'search'
  if (pathname.startsWith('/compose')) return 'post'
  return 'feed'
}

const tabs = [
  { id: 'feed', icon: Home, label: 'BITS', href: '/feed' },
  { id: 'interviews', icon: Briefcase, label: 'INTERVIEWS', href: '/interviews' },
  { id: 'search', icon: Search, label: 'SEARCH', href: '/search' },
  { id: 'post', icon: SquarePen, label: 'POST', href: '/compose' },
]

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const active = pathToActiveTab(pathname)
  const [notifOpen, setNotifOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Poll unread count every 60 seconds
  useEffect(() => {
    let cancelled = false
    const fetch = async () => {
      const count = await getUnreadNotificationCount()
      if (!cancelled) setUnreadCount(count)
    }
    fetch()
    const id = setInterval(fetch, 60_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  return (
    <div className="flex w-full h-full min-h-screen bg-[var(--bg)]">
      {/* Left Sidebar Navigation */}
      <nav className="w-20 lg:w-64 flex-shrink-0 border-r border-[var(--border)] bg-[rgba(5,5,14,0.98)] backdrop-blur-xl flex flex-col items-center lg:items-start p-4 fixed left-0 top-0 bottom-0 z-50">
        <div className="mb-8">
          {/* Full logo on wide sidebar */}
          <div className="hidden lg:block">
            <ByteAILogo size="md" showText />
          </div>
          {/* Icon-only on narrow sidebar */}
          <div className="lg:hidden">
            <ByteAILogo size="sm" showText={false} />
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-2 w-full">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = active === tab.id
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-[rgba(59,130,246,0.15)] text-[var(--accent)]'
                    : 'text-[var(--t2)] hover:text-[var(--t1)] hover:bg-[rgba(255,255,255,0.05)]'
                }`}
              >
                <Icon size={20} className="flex-shrink-0" />
                <span className="font-mono text-xs font-bold tracking-[0.07em] hidden lg:inline whitespace-nowrap">
                  {tab.label}
                </span>
              </Link>
            )
          })}
        </div>

        {/* Notification Bell */}
        <button
          onClick={() => setNotifOpen(true)}
          className="relative flex items-center gap-3 px-3 py-3 rounded-lg w-full text-[var(--t2)] hover:text-[var(--t1)] hover:bg-[rgba(255,255,255,0.05)] transition-all"
        >
          <span className="relative flex-shrink-0">
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-[var(--accent)] text-white font-mono text-[9px] font-bold leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </span>
          <span className="font-mono text-xs font-bold tracking-[0.07em] hidden lg:inline whitespace-nowrap">
            ALERTS
          </span>
        </button>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 ml-20 lg:ml-64 overflow-hidden">
        <PhoneFrame>{children}</PhoneFrame>
      </div>

      {/* Notification Panel */}
      <NotificationPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        onCountChange={setUnreadCount}
      />
    </div>
  )
}
