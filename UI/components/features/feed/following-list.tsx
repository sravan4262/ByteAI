"use client"

import { Avatar } from '@/components/layout/avatar'
import type { User } from '@/lib/api'

interface FollowingListProps {
  users: User[]
  onSelectUser: (user: User) => void
}

export function FollowingList({ users, onSelectUser }: FollowingListProps) {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 xl:px-16 py-6">
        <div className="font-mono text-[9px] md:text-[10px] text-[var(--t2)] mb-4 tracking-[0.1em]">
          PEOPLE YOU FOLLOW ({users.length})
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => onSelectUser(user)}
              className="flex items-center gap-3 p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl transition-all hover:border-[var(--accent)] hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] group"
            >
              <div className="relative">
                <Avatar
                  initials={user.initials}
                  size="md"
                  variant={user.id === '2' ? 'purple' : user.id === '3' ? 'green' : 'cyan'}
                />
                {user.isOnline && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[var(--green)] rounded-full border-2 border-[var(--bg-card)]" />
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="font-mono text-xs md:text-sm font-bold text-[var(--t1)] truncate">
                  @{user.username}
                </div>
                <div className="font-mono text-[10px] md:text-[11px] text-[var(--t2)] truncate">
                  {user.role} @ {user.company}
                </div>
                <div className="font-mono text-[9px] text-[var(--t3)] mt-1">
                  {user.bytes} Bytes · {user.followers} followers
                </div>
              </div>
              <span className="font-mono text-lg text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity">
                →
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
