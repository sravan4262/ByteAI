"use client"

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Heart, MessageCircle, UserPlus, UserMinus, Award, X, CheckCheck, Trash2 } from 'lucide-react'
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadNotificationCount,
  deleteNotification,
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

type NotificationMeta = {
  icon: React.ReactNode
  badgeColor: string
  badgeBg: string
  text: string
  preview?: string
}

function notificationMeta(n: NotificationResponse): NotificationMeta {
  const p = n.payload as Record<string, unknown> | null

  switch (n.type) {
    case 'like': {
      const lp = p as NotificationPayloadLike | null
      return {
        icon: <Heart size={10} className="fill-current" />,
        badgeColor: 'text-rose-400',
        badgeBg: 'bg-[rgba(244,63,94,0.12)] border-[rgba(244,63,94,0.25)]',
        text: lp
          ? `${lp.actorDisplayName || lp.actorUsername} liked your byte`
          : 'Someone liked your byte',
      }
    }
    case 'comment': {
      const cp = p as NotificationPayloadComment | null
      return {
        icon: <MessageCircle size={10} />,
        badgeColor: 'text-[var(--accent)]',
        badgeBg: 'bg-[rgba(59,130,246,0.12)] border-[rgba(59,130,246,0.25)]',
        text: cp
          ? `${cp.actorDisplayName || cp.actorUsername} commented on your byte`
          : 'Someone commented on your byte',
        preview: cp?.preview,
      }
    }
    case 'follow':
      return {
        icon: <UserPlus size={10} />,
        badgeColor: 'text-green-400',
        badgeBg: 'bg-[rgba(16,217,160,0.12)] border-[rgba(16,217,160,0.25)]',
        text: (p?.actorDisplayName as string) || (p?.actorUsername as string)
          ? `${p?.actorDisplayName || p?.actorUsername} started following you`
          : 'Someone followed you',
      }
    case 'unfollow':
      return {
        icon: <UserMinus size={10} />,
        badgeColor: 'text-orange-400',
        badgeBg: 'bg-[rgba(251,146,60,0.12)] border-[rgba(251,146,60,0.25)]',
        text: (p?.actorDisplayName as string) || (p?.actorUsername as string)
          ? `${p?.actorDisplayName || p?.actorUsername} unfollowed you`
          : 'Someone unfollowed you',
      }
    case 'badge':
      return {
        icon: <Award size={10} />,
        badgeColor: 'text-yellow-400',
        badgeBg: 'bg-[rgba(251,191,36,0.12)] border-[rgba(251,191,36,0.25)]',
        text: p?.badgeLabel
          ? `You earned the "${p.badgeLabel}" badge!`
          : 'You earned a new badge!',
      }
    case 'feedback_update':
      return {
        icon: <Bell size={10} />,
        badgeColor: 'text-[var(--purple)]',
        badgeBg: 'bg-[rgba(167,139,250,0.12)] border-[rgba(167,139,250,0.25)]',
        text: (p?.message as string) || 'Your feedback was updated',
        preview: p?.preview as string | undefined,
      }
    default:
      return {
        icon: <Bell size={10} />,
        badgeColor: 'text-[var(--t2)]',
        badgeBg: 'bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.1)]',
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
    <img
      src={url}
      alt={name}
      className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-card)]"
    />
  ) : (
    <div className="w-9 h-9 rounded-full bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.25)] flex items-center justify-center flex-shrink-0">
      <span className="font-mono text-[10px] font-bold text-[var(--accent)]">{initials || '?'}</span>
    </div>
  )
}

function NotificationItem({
  notification,
  onRead,
  onDelete,
}: {
  notification: NotificationResponse
  onRead: (id: string) => void
  onDelete: (id: string) => void
}) {
  const { icon, badgeColor, badgeBg, text, preview } = notificationMeta(notification)
  const p = notification.payload as Record<string, unknown> | null

  const isFeedbackUpdate = notification.type === 'feedback_update'
  const avatarUrl = (p?.actorAvatarUrl as string | null) ?? null
  const actorName = (p?.actorDisplayName as string) || (p?.actorUsername as string) || '?'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className={`group flex items-start gap-3 px-4 py-3.5 transition-colors border-b border-[var(--border-h)] last:border-none
        ${notification.read
          ? 'opacity-50 hover:opacity-70'
          : 'bg-[rgba(59,130,246,0.04)] hover:bg-[rgba(59,130,246,0.07)]'
        }`}
    >
      {/* Avatar */}
      <div
        className="cursor-pointer flex-shrink-0 mt-0.5"
        onClick={() => !notification.read && onRead(notification.id)}
      >
        {isFeedbackUpdate ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="https://api.dicebear.com/7.x/bottts/svg?seed=byteai"
            alt="ByteAI"
            className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-[var(--purple)] ring-offset-2 ring-offset-[var(--bg-card)]"
          />
        ) : (
          <ActorAvatar url={avatarUrl} name={actorName} />
        )}
      </div>

      {/* Content */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => !notification.read && onRead(notification.id)}
      >
        <p className="text-[13px] text-[var(--t1)] leading-snug">{text}</p>
        {preview && (
          <p className="text-xs text-[var(--t2)] mt-1 leading-snug line-clamp-1 italic">
            &ldquo;{preview}&rdquo;
          </p>
        )}
        <p className="font-mono text-[10px] text-[var(--t3)] mt-1 tracking-wide">
          {timeAgo(notification.createdAt)}
        </p>
      </div>

      {/* Right: type badge + delete */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <span className={`flex items-center justify-center w-5 h-5 rounded border ${badgeBg} ${badgeColor}`}>
          {icon}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(notification.id) }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--t3)] hover:text-red-400"
          aria-label="Delete notification"
        >
          <Trash2 size={11} />
        </button>
      </div>

      {/* Unread dot */}
      {!notification.read && (
        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-2 animate-pulse shadow-[0_0_5px_var(--accent)]" />
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

  const handleDelete = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    try {
      await deleteNotification(id)
      const count = await getUnreadNotificationCount()
      onCountChange?.(count)
    } catch {
      load(1, true)
    }
  }, [load, onCountChange])

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
            className="fixed right-0 top-0 bottom-0 z-50 w-[380px] max-w-[100vw] flex flex-col bg-[var(--bg)] border-l border-[var(--border-h)] shadow-2xl"
          >
            {/* Accent top line */}
            <div className="h-px bg-gradient-to-r from-[var(--accent)] via-[rgba(59,130,246,0.3)] to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-h)]">
              <div className="flex items-center gap-2.5">
                <span className="w-[3px] h-4 rounded-full bg-[var(--accent)] flex-shrink-0" />
                <span className="font-mono text-xs font-bold tracking-[0.08em] text-[var(--t1)] uppercase">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <motion.span
                    key={unreadCount}
                    initial={{ scale: 0.6 }}
                    animate={{ scale: 1 }}
                    className="flex items-center justify-center w-4 h-4 rounded-full bg-[var(--accent)] text-white font-mono text-[9px] font-bold shadow-[0_0_8px_rgba(59,130,246,0.5)]"
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
                    LOADING...
                  </span>
                </div>
              ) : notifications.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="mx-4 mt-6 border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] rounded-xl px-5 py-8 flex flex-col items-center gap-2 text-center"
                >
                  <Bell size={20} className="text-[var(--accent)] opacity-50" />
                  <p className="font-mono text-xs font-bold text-[var(--t1)]">NO NOTIFICATIONS YET</p>
                  <p className="text-xs text-[var(--t2)]">Activity from your bytes and followers will appear here.</p>
                </motion.div>
              ) : (
                <AnimatePresence initial={false}>
                  {notifications.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onRead={handleRead}
                      onDelete={handleDelete}
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
                    {loading ? 'LOADING...' : 'LOAD MORE'}
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
