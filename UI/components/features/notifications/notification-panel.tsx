"use client"

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Heart, MessageCircle, UserPlus, Award, X, CheckCheck } from 'lucide-react'
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadNotificationCount,
  type NotificationResponse,
  type NotificationPayloadLike,
  type NotificationPayloadComment,
} from '@/lib/api/client'

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function notificationMeta(n: NotificationResponse): {
  icon: React.ReactNode
  color: string
  text: string
} {
  const p = n.payload as Record<string, unknown> | null

  switch (n.type) {
    case 'like': {
      const lp = p as NotificationPayloadLike | null
      return {
        icon: <Heart size={14} className="fill-current" />,
        color: 'text-rose-400',
        text: lp
          ? `${lp.actorDisplayName || lp.actorUsername} liked your byte`
          : 'Someone liked your byte',
      }
    }
    case 'comment': {
      const cp = p as NotificationPayloadComment | null
      return {
        icon: <MessageCircle size={14} />,
        color: 'text-blue-400',
        text: cp
          ? `${cp.actorDisplayName || cp.actorUsername} commented: "${cp.preview}"`
          : 'Someone commented on your byte',
      }
    }
    case 'follow':
      return {
        icon: <UserPlus size={14} />,
        color: 'text-green-400',
        text: (p?.actorDisplayName as string) || (p?.actorUsername as string)
          ? `${p?.actorDisplayName || p?.actorUsername} started following you`
          : 'Someone followed you',
      }
    case 'badge':
      return {
        icon: <Award size={14} />,
        color: 'text-yellow-400',
        text: p?.badgeLabel
          ? `You earned the "${p.badgeLabel}" badge!`
          : 'You earned a new badge!',
      }
    default:
      return {
        icon: <Bell size={14} />,
        color: 'text-[var(--t2)]',
        text: 'New notification',
      }
  }
}

function ActorAvatar({ url, name }: { url?: string | null; name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
  ) : (
    <div className="w-8 h-8 rounded-full bg-[rgba(59,130,246,0.18)] flex items-center justify-center flex-shrink-0">
      <span className="font-mono text-[10px] font-bold text-[var(--accent)]">{initials || '?'}</span>
    </div>
  )
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: NotificationResponse
  onRead: (id: string) => void
}) {
  const { icon, color, text } = notificationMeta(notification)
  const p = notification.payload as Record<string, unknown> | null

  const avatarUrl = (p?.actorAvatarUrl as string | null) ?? null
  const actorName =
    (p?.actorDisplayName as string) || (p?.actorUsername as string) || '?'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      onClick={() => !notification.read && onRead(notification.id)}
      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-[var(--border)] last:border-none
        ${notification.read
          ? 'opacity-50 hover:opacity-70'
          : 'bg-[rgba(59,130,246,0.04)] hover:bg-[rgba(59,130,246,0.08)]'
        }`}
    >
      {/* Avatar */}
      <ActorAvatar url={avatarUrl} name={actorName} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-[var(--t1)] leading-snug">{text}</p>
        <p className="font-mono text-[10px] text-[var(--t3)] mt-0.5 tracking-wide">
          {timeAgo(notification.createdAt)}
        </p>
      </div>

      {/* Type icon */}
      <span className={`flex-shrink-0 mt-0.5 ${color}`}>{icon}</span>

      {/* Unread dot */}
      {!notification.read && (
        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-1.5" />
      )}
    </motion.div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface NotificationPanelProps {
  open: boolean
  onClose: () => void
  onCountChange?: (count: number) => void
}

export function NotificationPanel({ open, onClose, onCountChange }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<NotificationResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)

  const load = useCallback(async (p: number, replace: boolean) => {
    setLoading(true)
    const res = await getNotifications({ page: p, pageSize: 20 })
    setNotifications((prev) => (replace ? res.notifications : [...prev, ...res.notifications]))
    setHasMore(res.hasMore)
    setLoading(false)
  }, [])

  // Reload whenever panel opens
  useEffect(() => {
    if (!open) return
    setPage(1)
    load(1, true)
  }, [open, load])

  const handleRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
    await markNotificationRead(id)
    const count = await getUnreadNotificationCount()
    onCountChange?.(count)
  }, [onCountChange])

  const handleMarkAll = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    await markAllNotificationsRead()
    onCountChange?.(0)
  }, [onCountChange])

  const handleLoadMore = () => {
    const next = page + 1
    setPage(next)
    load(next, false)
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-[380px] max-w-[100vw] flex flex-col bg-[var(--bg)] border-l border-[var(--border)] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-[var(--accent)]" />
                <span className="font-mono text-xs font-bold tracking-[0.08em] text-[var(--t1)] uppercase">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <motion.span
                    key={unreadCount}
                    initial={{ scale: 0.6 }}
                    animate={{ scale: 1 }}
                    className="flex items-center justify-center w-4 h-4 rounded-full bg-[var(--accent)] text-white font-mono text-[9px] font-bold"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </motion.span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAll}
                    className="flex items-center gap-1 font-mono text-[10px] text-[var(--t2)] hover:text-[var(--accent)] transition-colors tracking-wide"
                  >
                    <CheckCheck size={12} />
                    MARK ALL READ
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1 rounded text-[var(--t2)] hover:text-[var(--t1)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
                  <span className="font-mono text-[10px] text-[var(--t3)] tracking-[0.1em]">
                    // LOADING...
                  </span>
                </div>
              ) : notifications.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="flex flex-col items-center justify-center h-48 gap-3"
                >
                  <Bell size={32} className="text-[var(--t3)]" />
                  <p className="font-mono text-[11px] text-[var(--t3)] tracking-[0.08em]">
                    // NO NOTIFICATIONS YET
                  </p>
                </motion.div>
              ) : (
                <AnimatePresence initial={false}>
                  {notifications.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onRead={handleRead}
                    />
                  ))}
                </AnimatePresence>
              )}

              {hasMore && (
                <div className="flex justify-center py-4">
                  <button
                    onClick={handleLoadMore}
                    disabled={loading}
                    className="font-mono text-[10px] text-[var(--accent)] hover:underline tracking-wide disabled:opacity-40"
                  >
                    {loading ? '// LOADING...' : '// LOAD MORE'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
