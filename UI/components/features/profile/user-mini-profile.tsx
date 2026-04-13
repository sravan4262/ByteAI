"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, BadgeCheck, UserPlus, UserMinus } from 'lucide-react'
import { Avatar } from '@/components/layout/avatar'
import { getProfile, followUser, unfollowUser } from '@/lib/api/client'
import { toast } from 'sonner'
import type { UserResponse } from '@/lib/api/client'

interface UserMiniProfileProps {
  userId: string
  username: string
  displayName: string
  initials: string
  avatarUrl?: string | null
  role?: string
  company?: string
  tags?: string[]
  onClose: () => void
}

export function UserMiniProfile({
  userId,
  username,
  displayName,
  initials,
  avatarUrl,
  role,
  company,
  tags = [],
  onClose,
}: UserMiniProfileProps) {
  const [profile, setProfile] = useState<UserResponse | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    if (username) {
      getProfile(username).then(p => { if (p) setProfile(p) })
    }
  }, [username])

  const handleFollow = async () => {
    setFollowLoading(true)
    try {
      if (isFollowing) {
        await unfollowUser(userId)
        setIsFollowing(false)
        toast.success(`Unfollowed @${username}`)
      } else {
        await followUser(userId)
        setIsFollowing(true)
        toast.success(`Following @${username}`)
      }
    } catch {
      toast.error('Action failed — try again')
    } finally {
      setFollowLoading(false)
    }
  }

  const resolvedName = profile?.displayName || displayName
  const resolvedAvatar = profile?.avatarUrl || avatarUrl
  const resolvedRole = profile?.roleTitle || role || ''
  const resolvedCompany = profile?.company || company || ''

  return (
    <AnimatePresence>
      <>
        {/* Backdrop */}
        <motion.div
          key="mini-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px]"
          onClick={onClose}
        />

        {/* Sheet */}
        <motion.div
          key="mini-sheet"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-[101] bg-[var(--bg-card)] border-t border-[var(--border)] rounded-t-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.5)] max-h-[70vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-[var(--border-m)]" />
          </div>

          <div className="px-5 pb-8 pt-2 flex flex-col gap-4">
            {/* Header row */}
            <div className="flex items-start gap-4">
              <Avatar
                initials={initials}
                imageUrl={resolvedAvatar}
                size="lg"
                variant="cyan"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-base text-[var(--t1)] leading-tight">{resolvedName}</span>
                  {(profile?.isVerified) && (
                    <BadgeCheck size={14} className="text-[var(--accent)] flex-shrink-0" />
                  )}
                </div>
                <div className="font-mono text-[11px] text-[var(--accent)] mt-0.5">@{username}</div>
                {(resolvedRole || resolvedCompany) && (
                  <div className="font-mono text-[10px] text-[var(--t2)] mt-1">
                    {resolvedRole}{resolvedRole && resolvedCompany ? ' @ ' : ''}{resolvedCompany}
                  </div>
                )}
                {profile?.bio && (
                  <div className="text-[11px] text-[var(--t2)] mt-1.5 leading-relaxed line-clamp-2">{profile.bio}</div>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-[var(--t3)] hover:text-[var(--t1)] flex-shrink-0 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Stats row */}
            <div className="flex gap-4">
              {[
                { label: 'BYTES', value: profile ? (profile as UserResponse & { bytesCount?: number }).bytesCount ?? '—' : '—' },
                { label: 'FOLLOWERS', value: '—' },
                { label: 'LEVEL', value: profile?.level ?? '—' },
              ].map(stat => (
                <div key={stat.label} className="flex-1 bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg px-3 py-2.5 text-center">
                  <div className="font-mono text-xs font-bold text-[var(--t1)]">{stat.value}</div>
                  <div className="font-mono text-[8px] tracking-[0.08em] text-[var(--t3)] mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div>
                <div className="font-mono text-[8px] tracking-[0.1em] text-[var(--t3)] mb-2">// TOPICS</div>
                <div className="flex flex-wrap gap-1.5">
                  {tags.slice(0, 8).map(tag => (
                    <span
                      key={tag}
                      className="font-mono text-[9px] px-2.5 py-1 rounded border border-[var(--border-m)] text-[var(--t2)] bg-[var(--bg-el)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Follow button */}
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`w-full py-3 rounded-xl font-mono text-[11px] font-bold tracking-[0.08em] flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                isFollowing
                  ? 'border border-[var(--border-m)] text-[var(--t2)] bg-[var(--bg-el)] hover:border-[var(--red)] hover:text-[var(--red)]'
                  : 'bg-gradient-to-br from-[var(--accent)] to-[#2563eb] text-white shadow-[0_4px_20px_var(--accent-glow)] hover:shadow-[0_6px_28px_var(--accent-glow)] hover:-translate-y-0.5'
              }`}
            >
              {isFollowing
                ? <><UserMinus size={14} /> UNFOLLOW</>
                : <><UserPlus size={14} /> FOLLOW @{username}</>}
            </button>
          </div>
        </motion.div>
      </>
    </AnimatePresence>
  )
}
