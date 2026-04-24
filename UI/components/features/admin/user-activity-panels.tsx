'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, LogIn, Clock } from 'lucide-react'
import { type ActivityUser, type ActivityPagedResult, getUserActivity } from '@/lib/api/admin-activity'

const PAGE_SIZE = 20

function formatRelative(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(iso).toLocaleDateString()
}

function UserRow({ user }: { user: ActivityUser }) {
  const initials = (user.displayName?.[0] ?? user.username[0]).toUpperCase()
  return (
    <div className="px-4 py-3 flex items-center gap-3 border-b border-[var(--border-h)] last:border-0">
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={user.displayName}
          className="w-7 h-7 rounded-full object-cover ring-2 ring-[var(--accent)] ring-offset-1 ring-offset-[var(--bg-card)] flex-shrink-0"
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)] flex items-center justify-center font-mono text-[10px] text-[var(--accent)] font-bold flex-shrink-0">
          {initials}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-mono text-[11px] font-bold text-[var(--t1)] truncate">{user.displayName}</div>
        <div className="font-mono text-[10px] text-[var(--t2)]">@{user.username}</div>
        <div className="font-mono text-[10px] text-[var(--t3)] truncate">{user.email}</div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Clock size={9} className="text-[var(--t3)]" />
        <span className="font-mono text-[10px] text-[var(--t2)]">{formatRelative(user.activityAt)}</span>
      </div>
    </div>
  )
}

function PanelSkeleton() {
  return (
    <div className="flex flex-col gap-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="px-4 py-3 flex items-center gap-3 border-b border-[var(--border-h)] last:border-0">
          <div className="w-7 h-7 rounded-full bg-[var(--bg-el)] animate-pulse flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="h-2.5 w-28 rounded bg-[var(--bg-el)] animate-pulse" />
            <div className="h-2 w-20 rounded bg-[var(--bg-el)] animate-pulse" />
            <div className="h-2 w-32 rounded bg-[var(--bg-el)] animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface PanelProps {
  title:        string
  icon:         React.ReactNode
  data:         ActivityPagedResult | null
  loading:      boolean
  loadingMore:  boolean
  onLoadMore:   () => void
  emptyIcon:    React.ReactNode
  emptyTitle:   string
  emptyMessage: string
}

function ActivityPanel({
  title, icon, data, loading, loadingMore, onLoadMore,
  emptyIcon, emptyTitle, emptyMessage,
}: PanelProps) {
  const hasMore = data ? data.items.length < data.totalCount : false

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="w-[3px] h-4 rounded-full bg-[var(--accent)] flex-shrink-0" />
        <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.05em]">{title}</span>
        {data && (
          <span className="font-mono text-[10px] text-[var(--t2)] bg-[var(--bg-el)] border border-[var(--border-h)] rounded-full px-2 py-px">
            {data.totalCount}
          </span>
        )}
        <span className="ml-auto">{icon}</span>
      </div>

      <div className="rounded-xl border border-[var(--border-h)] bg-[var(--bg-card)] overflow-hidden">
        <div className="h-px bg-gradient-to-r from-[var(--accent)] via-[rgba(59,130,246,0.3)] to-transparent" />

        {loading ? (
          <PanelSkeleton />
        ) : !data || data.items.length === 0 ? (
          <div className="px-5 py-10 text-center flex flex-col items-center gap-2">
            <span className="opacity-50">{emptyIcon}</span>
            <p className="font-mono text-xs font-bold text-[var(--t1)]">{emptyTitle}</p>
            <p className="text-xs text-[var(--t2)]">{emptyMessage}</p>
          </div>
        ) : (
          <>
            <div className="max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">
              {data.items.map(u => <UserRow key={u.userId} user={u} />)}
            </div>
            {hasMore && (
              <div className="px-4 py-3 border-t border-[var(--border-h)]">
                <button
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className="w-full py-2 rounded-lg font-mono text-[10px] font-bold border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:text-[var(--accent)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {loadingMore ? 'LOADING...' : `LOAD MORE (${data.totalCount - data.items.length} remaining)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export function UserActivityPanels() {
  const [todayData,         setTodayData]         = useState<ActivityPagedResult | null>(null)
  const [onlineData,        setOnlineData]        = useState<ActivityPagedResult | null>(null)
  const [loading,           setLoading]           = useState(true)
  const [todayLoadingMore,  setTodayLoadingMore]  = useState(false)
  const [onlineLoadingMore, setOnlineLoadingMore] = useState(false)
  const [todayPage,         setTodayPage]         = useState(1)
  const [onlinePage,        setOnlinePage]        = useState(1)

  const fetchPage = useCallback((page: number) => getUserActivity(page, PAGE_SIZE), [])

  useEffect(() => {
    fetchPage(1).then(res => {
      setTodayData(res.loggedInToday)
      setOnlineData(res.currentlyLoggedIn)
      setLoading(false)
    })
  }, [fetchPage])

  const loadMoreToday = async () => {
    const next = todayPage + 1
    setTodayLoadingMore(true)
    try {
      const res = await fetchPage(next)
      setTodayData(prev => prev
        ? { ...res.loggedInToday, items: [...prev.items, ...res.loggedInToday.items] }
        : res.loggedInToday)
      setTodayPage(next)
    } finally {
      setTodayLoadingMore(false)
    }
  }

  const loadMoreOnline = async () => {
    const next = onlinePage + 1
    setOnlineLoadingMore(true)
    try {
      const res = await fetchPage(next)
      setOnlineData(prev => prev
        ? { ...res.currentlyLoggedIn, items: [...prev.items, ...res.currentlyLoggedIn.items] }
        : res.currentlyLoggedIn)
      setOnlinePage(next)
    } finally {
      setOnlineLoadingMore(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ActivityPanel
        title="LOGGED IN TODAY"
        icon={<LogIn size={13} className="text-[var(--t3)]" />}
        data={todayData}
        loading={loading}
        loadingMore={todayLoadingMore}
        onLoadMore={loadMoreToday}
        emptyIcon={<LogIn size={20} className="text-[var(--accent)]" />}
        emptyTitle="NO LOGINS TODAY"
        emptyMessage="Users who signed in today appear here."
      />
      <ActivityPanel
        title="CURRENTLY LOGGED IN"
        icon={<Users size={13} className="text-[var(--t3)]" />}
        data={onlineData}
        loading={loading}
        loadingMore={onlineLoadingMore}
        onLoadMore={loadMoreOnline}
        emptyIcon={<Users size={20} className="text-[var(--accent)]" />}
        emptyTitle="NO ACTIVE SESSIONS"
        emptyMessage="Users with an active session appear here."
      />
    </div>
  )
}
