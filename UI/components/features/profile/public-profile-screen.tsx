"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, BadgeCheck, UserPlus, UserMinus, Heart, MessageSquare, Layers, FileText } from 'lucide-react'
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
    ? 'w-[68px] h-[68px] text-xl'
    : 'w-9 h-9 text-[10px]'

  const ringClass = 'ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-card)]'

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        referrerPolicy="no-referrer"
        className={`${sizeClass} rounded-full object-cover ${ringClass}`}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} rounded-full ${ringClass} bg-gradient-to-br from-[#131b40] to-[#1e3580] flex items-center justify-center font-mono font-bold text-[var(--accent)]`}
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
      className="rounded-xl border border-[var(--border-h)] bg-[var(--bg-card)] overflow-hidden cursor-pointer
                 transition-all hover:border-[var(--accent)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
    >
      <div className="h-px bg-gradient-to-r from-[var(--accent)] via-[rgba(59,130,246,0.3)] to-transparent" />
      <div className="px-4 pt-3.5 pb-4">
        <h3 className="font-bold text-sm text-[var(--t1)] leading-snug mb-1.5">{post.title}</h3>
        <p className="text-xs text-[var(--t2)] leading-relaxed line-clamp-2">{post.body}</p>
        <div className="flex items-center gap-3 mt-2.5 flex-wrap">
          <span className="font-mono text-[10px] text-[var(--t2)]">{post.createdAt}</span>
          <span className="flex items-center gap-1 font-mono text-[10px] text-[var(--t2)]">
            <Heart size={10} /> {post.likes ?? 0}
          </span>
          <span className="flex items-center gap-1 font-mono text-[10px] text-[var(--t2)]">
            <MessageSquare size={10} /> {post.comments ?? 0}
          </span>
          {(post.tags ?? []).slice(0, 2).map(tag => (
            <span key={tag} className="font-mono text-[10px] px-2 py-0.5 rounded border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t2)]">
              {tag}
            </span>
          ))}
        </div>
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
      className="rounded-xl border border-[var(--border-h)] bg-[var(--bg-card)] overflow-hidden cursor-pointer
                 transition-all hover:border-[var(--purple)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
    >
      <div className="h-px bg-gradient-to-r from-[var(--purple)] via-[rgba(167,139,250,0.3)] to-transparent" />
      <div className="px-4 pt-3.5 pb-4">
        <h3 className="font-bold text-sm text-[var(--t1)] leading-snug mb-1">{interview.title}</h3>
        {interview.company && (
          <div className="font-mono text-[10px] text-[var(--accent)] mb-2">@ {interview.company}</div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px] text-[var(--t2)]">{interview.questions.length} questions</span>
          {interview.role && (
            <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-[rgba(167,139,250,0.2)] bg-[rgba(167,139,250,0.03)] text-[var(--t2)]">
              {interview.role}
            </span>
          )}
          {interview.difficulty && (
            <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-[rgba(167,139,250,0.2)] bg-[rgba(167,139,250,0.03)] text-[var(--t2)]">
              {interview.difficulty}
            </span>
          )}
        </div>
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
      if (p?.isFollowedByMe !== undefined) setIsFollowing(p.isFollowedByMe)
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

  return (
    <PhoneFrame>
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-h)] bg-[var(--bg)] flex-shrink-0">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-lg border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)]
                     hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:text-[var(--accent)] transition-all"
        >
          <ArrowLeft size={16} />
        </button>
        <span className="font-mono text-xs font-bold tracking-[0.08em] text-[var(--t1)]">
          @{username}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">
        {loading ? (
          <div className="flex flex-col gap-4 px-5 pt-6 animate-pulse">
            <div className="flex items-start gap-4">
              <div className="w-[68px] h-[68px] rounded-full bg-[var(--border-h)]" />
              <div className="flex-1 flex flex-col gap-2 pt-2">
                <div className="h-5 w-40 bg-[var(--border-h)] rounded" />
                <div className="h-3 w-24 bg-[var(--border-h)] rounded" />
                <div className="h-3 w-32 bg-[var(--border-h)] rounded" />
              </div>
            </div>
          </div>
        ) : !profile ? (
          <div className="mx-5 mt-8 border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] rounded-xl px-5 py-10 text-center flex flex-col items-center gap-3">
            <Layers size={20} className="text-[var(--accent)] opacity-50" />
            <p className="font-mono text-xs font-bold text-[var(--t1)]">USER NOT FOUND</p>
            <button
              onClick={() => router.back()}
              className="font-mono text-[10px] font-bold px-3 py-1.5 rounded-lg border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)]
                         hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:text-[var(--accent)] transition-all"
            >
              GO BACK
            </button>
          </div>
        ) : (
          <>
            {/* Profile Hero */}
            <div className="px-5 pt-5 pb-4 border-b border-[var(--border-h)] bg-gradient-to-b from-[rgba(59,130,246,0.06)] to-transparent">
              {(() => {
                const isSystemAccount = (profile.username ?? '').toLowerCase() === 'byteai'
                return (
                  <div className="flex items-start justify-between mb-4">
                    <Avatar name={profile.displayName} imageUrl={profile.avatarUrl} size="lg" />

                    {isSystemAccount ? (
                      <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[rgba(167,139,250,0.4)] bg-[rgba(167,139,250,0.08)]">
                        <span className="font-mono text-[10px] font-bold text-[var(--purple)] tracking-[0.08em]">✦ OFFICIAL</span>
                      </div>
                    ) : (
                      <button
                        onClick={handleFollow}
                        disabled={followLoading}
                        className={`px-4 py-2 rounded-lg font-mono text-[10px] font-bold tracking-[0.08em] flex items-center gap-1.5 transition-all disabled:opacity-50 ${
                          isFollowing
                            ? 'border border-[var(--border-h)] text-[var(--t1)] bg-[var(--bg-el)] hover:border-[rgba(244,63,94,0.4)] hover:bg-[rgba(244,63,94,0.08)] hover:text-[var(--red)]'
                            : 'bg-gradient-to-br from-[var(--accent)] to-[#2563eb] text-white shadow-[0_4px_20px_var(--accent-glow)]'
                        }`}
                      >
                        {followLoading
                          ? <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                          : isFollowing
                            ? <><UserMinus size={12} /> UNFOLLOW</>
                            : <><UserPlus size={12} /> FOLLOW</>
                        }
                      </button>
                    )}
                  </div>
                )
              })()}

              <div className="text-xl font-extrabold tracking-tight flex items-center gap-2 text-[var(--t1)]">
                {profile.displayName}
                {profile.isVerified && (
                  <BadgeCheck size={16} className="text-[var(--accent)]" />
                )}
              </div>
              <div className="font-mono text-[11px] text-[var(--accent)] mt-0.5">@{profile.username}</div>

              {(profile.roleTitle || profile.company) && (
                <div className="font-mono text-[10px] text-[var(--t2)] mt-1.5 tracking-[0.04em]">
                  {profile.roleTitle}{profile.roleTitle && profile.company ? ' @ ' : ''}{profile.company}
                </div>
              )}

              {profile.bio && (
                <p className="text-xs text-[var(--t2)] mt-2 leading-relaxed border-l-2 border-[var(--accent)] pl-2.5">
                  {profile.bio}
                </p>
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
                    className="bg-[var(--bg-el)] border border-[var(--border-h)] rounded-xl px-3 py-2.5 text-center"
                  >
                    <div className="font-mono text-sm font-bold text-[var(--t1)]">{stat.value}</div>
                    <div className="font-mono text-[10px] tracking-[0.08em] text-[var(--t2)] mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Content Tabs */}
            <div className="flex gap-2 px-4 py-3 border-b border-[var(--border-h)] sticky top-0 bg-[var(--bg)] z-10">
              {(['bytes', 'interviews'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`font-mono text-[10px] font-bold tracking-[0.08em] px-4 py-1.5 rounded-lg border transition-all ${
                    tab === t
                      ? 'border-[var(--accent)] bg-[var(--accent-d)] text-[var(--accent)] shadow-[0_0_12px_rgba(59,130,246,0.2)]'
                      : 'border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:text-[var(--accent)]'
                  }`}
                >
                  {t === 'bytes' ? '⬡ BYTES' : '◈ INTERVIEWS'}
                </button>
              ))}
            </div>

            {/* Content */}
            {contentLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-5 h-5 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
              </div>
            ) : tab === 'bytes' ? (
              bytes.length === 0 ? (
                <div className="mx-4 mt-4 border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] rounded-xl px-5 py-8 text-center flex flex-col items-center gap-2">
                  <FileText size={20} className="text-[var(--accent)] opacity-50" />
                  <p className="font-mono text-xs font-bold text-[var(--t1)]">NO BYTES YET</p>
                  <p className="text-xs text-[var(--t2)]">This user hasn&apos;t posted any bytes yet.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 p-2">
                  {bytes.map(post => (
                    <ByteCard
                      key={post.id}
                      post={post}
                      onClick={() => router.push(`/post/${post.id}`)}
                    />
                  ))}
                </div>
              )
            ) : (
              interviews.length === 0 ? (
                <div className="mx-4 mt-4 border border-[rgba(167,139,250,0.2)] bg-[rgba(167,139,250,0.03)] rounded-xl px-5 py-8 text-center flex flex-col items-center gap-2">
                  <Layers size={20} className="text-[var(--purple)] opacity-50" />
                  <p className="font-mono text-xs font-bold text-[var(--t1)]">NO INTERVIEWS YET</p>
                  <p className="text-xs text-[var(--t2)]">This user hasn&apos;t shared any interviews yet.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 p-2">
                  {interviews.map(interview => (
                    <InterviewCard
                      key={interview.id}
                      interview={interview}
                      onClick={() => router.push(`/interviews/${interview.id}`)}
                    />
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>
    </PhoneFrame>
  )
}
