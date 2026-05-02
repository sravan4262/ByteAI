"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Briefcase, Search, SquarePen, Bell, Settings, MessageSquare } from 'lucide-react'
import { PhoneFrame } from '@/components/layout/phone-frame'
import { ByteAILogo } from '@/components/layout/byteai-logo'
import { NotificationPanel } from '@/components/features/notifications/notification-panel'
import { NotificationContext } from '@/components/layout/notification-context'
import { MessagesPanel } from '@/components/features/chat/MessagesPanel'
import { ChatConnectionProvider } from '@/context/chat-connection-context'
import { useIsAdmin } from '@/hooks/use-is-admin'
import { useFeatureFlag } from '@/hooks/use-feature-flags'
import { useConversations } from '@/hooks/use-conversations'
import { useEffect, useState, useMemo } from 'react'
import { getUnreadNotificationCount } from '@/lib/api/client'
import { TerminalWidget } from '@/components/features/terminal/TerminalWidget'
import { HiddenFeaturesProvider } from '@/components/features/easter-eggs/HiddenFeaturesProvider'
import type { ReactNode } from 'react'

const pathToActiveTab = (pathname: string) => {
  if (pathname.startsWith('/interviews')) return 'interviews'
  if (pathname.startsWith('/search')) return 'search'
  if (pathname.startsWith('/compose')) return 'post'
  if (pathname.startsWith('/admin')) return 'admin'
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
  const [msgOpen, setMsgOpen] = useState(false)
  const [chatEverOpened, setChatEverOpened] = useState(false)
  const [termOpen, setTermOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const { isAdmin, isLoaded } = useIsAdmin()
  const hasChatFlag = useFeatureFlag('chat')
  const { conversations, loading: conversationsLoading, reload: reloadConversations, markConversationRead, bumpConversation } = useConversations(hasChatFlag === true)
  const hasUnreadMessages = hasChatFlag && conversations.some(c => c.hasUnread)

  // Poll unread notification count every 60 seconds
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

  const notifCtx = useMemo(() => ({ openNotifications: () => setNotifOpen(true), unreadCount }), [unreadCount])

  return (
    <NotificationContext.Provider value={notifCtx}>
    <div className="flex w-full h-full min-h-screen bg-[var(--bg)]">
      {/* Left Sidebar Navigation */}
      <nav className="w-20 lg:w-64 flex-shrink-0 border-r border-[var(--border-h)] bg-[var(--bg-card)] backdrop-blur-xl flex flex-col items-center lg:items-start p-4 fixed left-0 top-0 bottom-0 z-50" onClick={() => notifOpen && setNotifOpen(false)}>
        <div className="mb-8">
          <div className="hidden lg:block">
            <ByteAILogo size="md" showText />
          </div>
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
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all border ${
                  isActive
                    ? 'border-[var(--accent)] bg-[rgba(59,130,246,0.15)] text-[var(--accent)] shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                    : 'border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)]'
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
          onClick={(e) => { e.stopPropagation(); setNotifOpen((v) => !v) }}
          className="relative flex items-center gap-3 px-3 py-3 rounded-lg w-full border transition-all border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)]"
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

        {/* Admin Button */}
        {isLoaded && isAdmin && (
          <Link
            href="/admin"
            className={`flex items-center gap-3 px-3 py-3 rounded-lg w-full transition-all border ${
              active === 'admin'
                ? 'border-[var(--accent)] bg-[rgba(59,130,246,0.15)] text-[var(--accent)] shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                : 'border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)]'
            }`}
          >
            <Settings size={20} className="flex-shrink-0" />
            <span className="font-mono text-xs font-bold tracking-[0.07em] hidden lg:inline whitespace-nowrap">
              ADMIN
            </span>
          </Link>
        )}
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

      {/* Messages floating button — left of terminal/support button */}
      {hasChatFlag && (
        <button
          onClick={() => { setMsgOpen(v => !v); setChatEverOpened(true); setTermOpen(false) }}
          title="Messages"
          className={`fixed bottom-5 right-[3.75rem] z-50 w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-200 ${
            msgOpen
              ? 'bg-[rgba(16,217,160,0.15)] border-[var(--green)] text-[var(--green)] shadow-[0_0_20px_rgba(16,217,160,0.45)]'
              : 'bg-[var(--bg-card)] border-[rgba(16,217,160,0.25)] text-[var(--t2)] hover:border-[var(--green)] hover:text-[var(--green)] hover:shadow-[0_0_16px_rgba(16,217,160,0.25)]'
          }`}
        >
          <span className="relative">
            <MessageSquare size={16} />
            {hasUnreadMessages && !msgOpen && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--green)] shadow-[0_0_6px_rgba(16,217,160,0.8)]" />
            )}
          </span>
        </button>
      )}

      {/* Messages Panel */}
      {hasChatFlag && chatEverOpened && (
        <ChatConnectionProvider>
          <MessagesPanel
            open={msgOpen}
            onClose={() => setMsgOpen(false)}
            conversations={conversations}
            conversationsLoading={conversationsLoading}
            reloadConversations={reloadConversations}
            markConversationRead={markConversationRead}
            bumpConversation={bumpConversation}
          />
        </ChatConnectionProvider>
      )}

      {/* Terminal feedback widget — Ctrl+` to toggle */}
      <TerminalWidget
        open={termOpen}
        onOpenChange={(v) => { setTermOpen(v); if (v) setMsgOpen(false) }}
      />

      {/* Hidden Features cheat sheet — `?` key, Konami, or `eastereggs` terminal command */}
      <HiddenFeaturesProvider />
    </div>
    </NotificationContext.Provider>
  )
}
