"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X, BadgeCheck, UserCheck, UserPlus, ArrowUpRight, Briefcase } from 'lucide-react'
import { Avatar } from '@/components/layout/avatar'
import { getProfileById, followUser, unfollowUser } from '@/lib/api/client'
import { getMeCache } from '@/lib/user-cache'
import { useUser } from '@clerk/nextjs'
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
  const router = useRouter()
  const { user: clerkUser } = useUser()
  const [profile, setProfile] = useState<UserResponse | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [hoverUnfollow, setHoverUnfollow] = useState(false)

  const meCache = getMeCache()
  const isOwnProfile = meCache?.userId === userId

  useEffect(() => {
    if (!userId) return
    getProfileById(userId).then(p => {
      if (p) {
        setProfile(p)
        if (p.isFollowedByMe !== undefined) setIsFollowing(p.isFollowedByMe)
      }
    })
  }, [userId])

  const handleFollow = async () => {
    setFollowLoading(true)
    try {
      if (isFollowing) {
        await unfollowUser(userId)
        setIsFollowing(false)
        toast.success(`Unfollowed @${resolvedUsername}`)
      } else {
        await followUser(userId)
        setIsFollowing(true)
        toast.success(`Following @${resolvedUsername}`)
      }
    } catch {
      toast.error('Action failed — try again')
    } finally {
      setFollowLoading(false)
    }
  }

  const resolvedUsername = profile?.username || (isOwnProfile ? meCache?.username : null) || username
  const resolvedName = profile?.displayName || (isOwnProfile ? meCache?.displayName : null) || displayName
  const resolvedAvatar = profile?.avatarUrl
    || (isOwnProfile ? (meCache?.avatarUrl || clerkUser?.imageUrl) : null)
    || avatarUrl
    || (isOwnProfile ? clerkUser?.imageUrl : null)
  const resolvedRole = profile?.roleTitle || (isOwnProfile ? meCache?.roleTitle : null) || role || ''
  const resolvedCompany = profile?.company || (isOwnProfile ? meCache?.company : null) || company || ''
  const resolvedBytes = profile?.bytesCount ?? (isOwnProfile ? meCache?.bytesCount : undefined) ?? '—'
  const resolvedFollowers = profile?.followersCount ?? (isOwnProfile ? meCache?.followersCount : undefined) ?? '—'
  const resolvedLevel = profile?.level ?? (isOwnProfile ? meCache?.level : undefined) ?? '—'

  const resolvedInitials = resolvedName
    .split(' ')
    .filter(w => /[a-zA-Z]/.test(w[0] || ''))
    .map(w => w[0].toUpperCase())
    .slice(0, 2)
    .join('') || initials

  const handleViewProfile = () => {
    router.push(`/u/${resolvedUsername}`)
    onClose()
  }

  const stats = [
    { label: 'BYTES', value: resolvedBytes },
    { label: 'FOLLOWERS', value: resolvedFollowers },
    { label: 'LEVEL', value: resolvedLevel },
  ]

  return (
    <AnimatePresence>
      <>
        {/* Backdrop */}
        <motion.div
          key="mini-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-[3px]"
          onClick={onClose}
        />

        {/* Sheet */}
        <motion.div
          key="mini-sheet"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.9 }}
          className="fixed bottom-0 left-0 right-0 z-[101] max-h-[85vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="bg-[var(--bg-card)] rounded-t-3xl border-t border-x border-[var(--border)] shadow-[0_-16px_60px_rgba(0,0,0,0.45)] overflow-hidden">

            {/* Gradient banner */}
            <div className="relative h-24 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent)] via-[var(--purple)] to-[var(--cyan)] opacity-20" />
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, var(--t1) 1px, transparent 0)', backgroundSize: '24px 24px' }}
              />
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[var(--bg-card)]/60 backdrop-blur-sm border border-[var(--border)] flex items-center justify-center text-[var(--t2)] hover:text-[var(--t1)] transition-colors"
              >
                <X size={13} />
              </button>
              {/* Drag handle */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-white/20" />
            </div>

            {/* Avatar — overlaps the banner */}
            <div className="px-5 pb-5">
              <div className="flex items-end gap-4 -mt-9 mb-4">
                <div
                  className="relative cursor-pointer flex-shrink-0"
                  onClick={handleViewProfile}
                >
                  <div className="rounded-2xl ring-4 ring-[var(--bg-card)] overflow-hidden">
                    <Avatar
                      initials={resolvedInitials}
                      imageUrl={resolvedAvatar}
                      size="xl"
                      variant="cyan"
                    />
                  </div>
                </div>
                {/* Stats inline with avatar baseline */}
                <div className="flex-1 flex gap-2 pb-1">
                  {stats.map(stat => (
                    <div key={stat.label} className="flex-1 text-center">
                      <div className="font-mono text-sm font-bold text-[var(--t1)] leading-none">{stat.value}</div>
                      <div className="font-mono text-[8px] tracking-[0.1em] text-[var(--t3)] mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Name + role */}
              <div className="mb-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-[15px] text-[var(--t1)] leading-tight">{resolvedName}</span>
                  {profile?.isVerified && (
                    <BadgeCheck size={14} className="text-[var(--accent)] flex-shrink-0" />
                  )}
                </div>
                <button
                  onClick={handleViewProfile}
                  className="font-mono text-[11px] text-[var(--accent)] hover:underline text-left mt-0.5"
                >
                  @{resolvedUsername}
                </button>

                {(resolvedRole || resolvedCompany) && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Briefcase size={11} className="text-[var(--t3)] flex-shrink-0" />
                    <span className="font-mono text-[10px] text-[var(--t2)]">
                      {resolvedRole}{resolvedRole && resolvedCompany ? ' @ ' : ''}{resolvedCompany}
                    </span>
                  </div>
                )}

                {profile?.bio && (
                  <p className="text-[11px] text-[var(--t2)] mt-2 leading-relaxed line-clamp-2 border-l-2 border-[var(--border-h)] pl-2.5">
                    {profile.bio}
                  </p>
                )}
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {tags.slice(0, 6).map(tag => (
                    <span
                      key={tag}
                      className="font-mono text-[9px] px-2 py-0.5 rounded-full border border-[var(--border-m)] text-[var(--t2)] bg-[var(--bg-el)]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Action buttons — equal width */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Follow / Unfollow toggle */}
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  onMouseEnter={() => isFollowing && setHoverUnfollow(true)}
                  onMouseLeave={() => setHoverUnfollow(false)}
                  className={`relative py-3 rounded-2xl font-mono text-[11px] font-bold tracking-[0.07em] flex items-center justify-center gap-2 transition-all duration-200 overflow-hidden disabled:opacity-50 ${
                    isFollowing
                      ? hoverUnfollow
                        ? 'bg-[var(--red)]/10 border border-[var(--red)] text-[var(--red)]'
                        : 'bg-[var(--bg-el)] border border-[var(--border-m)] text-[var(--t1)]'
                      : 'bg-gradient-to-r from-[var(--accent)] to-[#2563eb] text-white shadow-[0_4px_18px_var(--accent-glow)]'
                  }`}
                >
                  {followLoading ? (
                    <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  ) : isFollowing ? (
                    hoverUnfollow ? (
                      <><X size={13} /> UNFOLLOW</>
                    ) : (
                      <><UserCheck size={13} /> FOLLOWING</>
                    )
                  ) : (
                    <><UserPlus size={13} /> FOLLOW</>
                  )}
                </button>

                {/* View profile */}
                <button
                  onClick={handleViewProfile}
                  className="py-3 rounded-2xl font-mono text-[11px] font-bold tracking-[0.07em] border border-[var(--border-h)] text-[var(--t1)] bg-[var(--bg-el)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-d)] transition-all duration-200 flex items-center justify-center gap-2"
                >
                  PROFILE <ArrowUpRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </>
    </AnimatePresence>
  )
}
