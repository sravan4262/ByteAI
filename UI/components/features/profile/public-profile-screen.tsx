"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, BadgeCheck, UserPlus, UserMinus, Heart, MessageSquare } from 'lucide-react'
import { PhoneFrame } from '@/components/layout/phone-frame'
import { getProfile, getUserBytes, getInterviews, followUser, unfollowUser } from '@/lib/api/client'
import { toast } from 'sonner'
import type { UserResponse, Post, InterviewWithQuestions } from '@/lib/api/client'

type Tab = 'bytes' | 'interviews'

function Avatar({ name, imageUrl, size = 'lg' }: { name: string; imageUrl?: string | null; size?: 'sm' | 'lg' }) {
  const initials = name
    .split(' ')
    .filter(w => /[a-zA-Z]/.test(w[0] || ''))
    .map(w => w[0].toUpperCase())
    .slice(0, 2)
    .join('') || '?'

  const sizeClass = size === 'lg'
    ? 'w-[68px] h-[68px] text-[22px]'
    : 'w-9 h-9 text-[10px]'

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        referrerPolicy="no-referrer"
        className={`${sizeClass} rounded-full object-cover border-2 border-[var(--border-h)]`}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} rounded-full border-2 border-[var(--border-h)] bg-gradient-to-br from-[#131b40] to-[#1e3580] flex items-center justify-center font-mono font-bold text-[var(--cyan)]`}
    >
      {initials}
    </div>
  )
}

function ByteCard({ post, onClick }: { post: Post; onClick: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      onClick={onClick}
      className="px-4 py-4 border-b border-[var(--border)] cursor-pointer hover:bg-[rgba(59,130,246,0.04)] transition-colors"
    >
      <h3 className="font-bold text-sm text-[var(--t1)] leading-snug mb-1.5">{post.title}</h3>
      <p className="text-[12px] text-[var(--t1)] leading-relaxed line-clamp-2">{post.body}</p>
      <div className="flex items-center gap-3 mt-2.5">
        <span className="font-mono text-[10px] text-[var(--t2)]">{post.createdAt}</span>
        <span className="flex items-center gap-1 font-mono text-[10px] text-[var(--t2)]">
          <Heart size={10} /> {post.likes ?? 0}
        </span>
        <span className="flex items-center gap-1 font-mono text-[10px] text-[var(--t2)]">
          <MessageSquare size={10} /> {post.comments ?? 0}
        </span>
        {(post.tags ?? []).slice(0, 2).map(tag => (
          <span key={tag} className="font-mono text-[9px] px-2 py-0.5 rounded border border-[var(--border-m)] text-[var(--t2)]">
            {tag}
          </span>
        ))}
      </div>
    </motion.div>
  )
}

function InterviewCard({ interview, onClick }: { interview: InterviewWithQuestions; onClick: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      onClick={onClick}
      className="px-4 py-4 border-b border-[var(--border)] cursor-pointer hover:bg-[rgba(59,130,246,0.04)] transition-colors"
    >
      <h3 className="font-bold text-sm text-[var(--t1)] leading-snug mb-1">{interview.title}</h3>
      {interview.company && (
        <div className="font-mono text-[10px] text-[var(--accent)] mb-1.5">@ {interview.company}</div>
      )}
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] text-[var(--t3)]">{interview.questions.length} questions</span>
        {interview.role && (
          <span className="font-mono text-[9px] px-2 py-0.5 rounded border border-[var(--border-m)] text-[var(--t3)]">
            {interview.role}
          </span>
        )}
        {interview.difficulty && (
          <span className="font-mono text-[9px] px-2 py-0.5 rounded border border-[var(--border-m)] text-[var(--t3)]">
            {interview.difficulty}
          </span>
        )}
      </div>
    </motion.div>
  )
}

export function PublicProfileScreen({ username }: { username: string }) {
  const router = useRouter()
  const [profile, setProfile] = useState<UserResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [tab, setTab] = useState<Tab>('bytes')
  const [bytes, setBytes] = useState<Post[]>([])
  const [interviews, setInterviews] = useState<InterviewWithQuestions[]>([])
  const [contentLoading, setContentLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    getProfile(username).then(p => {
      setProfile(p)
      setLoading(false)
    })
  }, [username])

  useEffect(() => {
    if (!profile) return
    setContentLoading(true)
    if (tab === 'bytes') {
      getUserBytes(profile.id, { pageSize: 30 }).then(res => {
        setBytes(res.posts)
        setContentLoading(false)
      })
    } else {
      getInterviews({ authorId: profile.id, pageSize: 30 }).then(res => {
        setInterviews(res.interviews)
        setContentLoading(false)
      })
    }
  }, [profile, tab])

  const handleFollow = async () => {
    if (!profile) return
    setFollowLoading(true)
    try {
      if (isFollowing) {
        await unfollowUser(profile.id)
        setIsFollowing(false)
        toast.success(`Unfollowed @${profile.username}`)
      } else {
        await followUser(profile.id)
        setIsFollowing(true)
        toast.success(`Following @${profile.username}`)
      }
    } catch {
      toast.error('Action failed — try again')
    } finally {
      setFollowLoading(false)
    }
  }

  const initials = (profile?.displayName || username)
    .split(' ')
    .filter(w => /[a-zA-Z]/.test(w[0] || ''))
    .map(w => w[0].toUpperCase())
    .slice(0, 2)
    .join('') || '?'

  return (
    <PhoneFrame>
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--bg)] flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-lg text-[var(--t2)] hover:text-[var(--t1)] hover:bg-[rgba(255,255,255,0.06)] transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="font-mono text-xs font-bold tracking-[0.08em] text-[var(--t1)]">
          @{username}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">
        {loading ? (
          <div className="flex flex-col gap-4 px-5 pt-6 animate-pulse">
            <div className="flex items-start gap-4">
              <div className="w-[68px] h-[68px] rounded-full bg-[var(--border-m)]" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-5 w-40 bg-[var(--border-m)] rounded" />
                <div className="h-3 w-24 bg-[var(--border)] rounded" />
                <div className="h-3 w-32 bg-[var(--border)] rounded" />
              </div>
            </div>
          </div>
        ) : !profile ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <span className="font-mono text-[11px] text-[var(--t3)] tracking-[0.08em]">// USER NOT FOUND</span>
            <button
              onClick={() => router.back()}
              className="font-mono text-[10px] text-[var(--accent)] hover:underline"
            >
              GO BACK
            </button>
          </div>
        ) : (
          <>
            {/* Profile Hero */}
            <div className="px-5 pt-5 pb-4 border-b border-[var(--border)] bg-gradient-to-b from-[rgba(59,130,246,0.06)] to-transparent">
              <div className="flex items-start justify-between mb-3">
                <div className="relative">
                  <div className="absolute -inset-[3px] rounded-full bg-[conic-gradient(from_0deg,var(--cyan),var(--accent),var(--purple),var(--cyan))] animate-spin-ring blur-[2px] opacity-70" />
                  <div className="relative">
                    <Avatar name={profile.displayName} imageUrl={profile.avatarUrl} size="lg" />
                  </div>
                </div>

                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`px-4 py-2 rounded-lg font-mono text-[10px] font-bold tracking-[0.08em] flex items-center gap-1.5 transition-all disabled:opacity-50 ${
                    isFollowing
                      ? 'border border-[var(--border-m)] text-[var(--t2)] bg-[var(--bg-el)] hover:border-red-500 hover:text-red-400'
                      : 'bg-gradient-to-br from-[var(--accent)] to-[#2563eb] text-white shadow-[0_4px_20px_var(--accent-glow)]'
                  }`}
                >
                  {isFollowing
                    ? <><UserMinus size={12} /> UNFOLLOW</>
                    : <><UserPlus size={12} /> FOLLOW</>}
                </button>
              </div>

              <div className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                {profile.displayName}
                {profile.isVerified && (
                  <BadgeCheck size={16} className="text-[var(--accent)]" />
                )}
              </div>
              <div className="font-mono text-[11px] text-[var(--accent)] mt-0.5">@{profile.username}</div>

              {(profile.roleTitle || profile.company) && (
                <div className="font-mono text-[10px] text-[var(--t1)] mt-1 tracking-[0.04em]">
                  {profile.roleTitle}{profile.roleTitle && profile.company ? ' @ ' : ''}{profile.company}
                </div>
              )}

              {profile.bio && (
                <p className="text-xs text-[var(--t1)] mt-2 leading-relaxed">{profile.bio}</p>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[
                  { label: 'BYTES', value: profile.bytesCount ?? '—' },
                  { label: 'FOLLOWERS', value: profile.followersCount ?? '—' },
                  { label: 'LEVEL', value: profile.level },
                ].map(stat => (
                  <div
                    key={stat.label}
                    className="bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg px-3 py-2.5 text-center"
                  >
                    <div className="font-mono text-xs font-bold text-[var(--t1)]">{stat.value}</div>
                    <div className="font-mono text-[8px] tracking-[0.08em] text-[var(--t2)] mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Content Tabs */}
            <div className="flex border-b border-[var(--border)] sticky top-0 bg-[var(--bg)] z-10">
              {(['bytes', 'interviews'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-3 font-mono text-[10px] font-bold tracking-[0.08em] transition-colors ${
                    tab === t
                      ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
                      : 'text-[var(--t3)] hover:text-[var(--t2)]'
                  }`}
                >
                  {t === 'bytes' ? '⬡ BYTES' : '◈ INTERVIEWS'}
                </button>
              ))}
            </div>

            {/* Content */}
            {contentLoading ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <div className="w-5 h-5 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
              </div>
            ) : tab === 'bytes' ? (
              bytes.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <p className="font-mono text-[10px] text-[var(--t3)]">// NO BYTES YET</p>
                </div>
              ) : (
                bytes.map(post => (
                  <ByteCard
                    key={post.id}
                    post={post}
                    onClick={() => router.push(`/post/${post.id}`)}
                  />
                ))
              )
            ) : (
              interviews.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <p className="font-mono text-[10px] text-[var(--t3)]">// NO INTERVIEWS YET</p>
                </div>
              ) : (
                interviews.map(interview => (
                  <InterviewCard
                    key={interview.id}
                    interview={interview}
                    onClick={() => router.push(`/interviews/${interview.id}`)}
                  />
                ))
              )
            )}
          </>
        )}
      </div>
    </PhoneFrame>
  )
}
