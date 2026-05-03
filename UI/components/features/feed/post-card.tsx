"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, MessageSquare, Bookmark, Share2, BadgeCheck } from 'lucide-react'
import { Avatar } from '@/components/layout/avatar'
import { CodeBlock } from '@/components/ui/code-block'
import { LikersSheet } from '@/components/ui/likers-sheet'
import { UserMiniProfile } from '@/components/features/profile/user-mini-profile'
import { OverflowMenu } from '@/components/features/moderation/overflow-menu'
import { renderMentions } from '@/lib/utils/render-mentions'
import type { Post } from '@/lib/api'

interface PostCardProps {
  post: Post
  activeTab: string
  onLike: (id: string) => void
  onBookmark: (id: string) => void
  onShare: (id: string) => void
  shouldTruncate: boolean
  currentUserId?: string | null
  onAuthorBlocked?: (authorId: string) => void
}

export function PostCard({ post, activeTab, onLike, onBookmark, onShare, shouldTruncate, currentUserId, onAuthorBlocked }: PostCardProps) {
  const router = useRouter()
  const [showLikers, setShowLikers] = useState(false)
  const [showMiniProfile, setShowMiniProfile] = useState(false)

  return (
    <article className="flex flex-col border border-[var(--border-h)] rounded-xl bg-[var(--bg-card)] overflow-hidden">
      {/* Top gradient line */}
      <div className="h-px bg-gradient-to-r from-[var(--accent)] via-[rgba(59,130,246,0.3)] to-transparent flex-shrink-0" />
      <div className="px-4 md:px-8 py-5 md:py-6 flex flex-col gap-4">

      {/* Post header */}
      <div className="flex items-start gap-3 md:gap-4">
        <Avatar
          initials={post.author.initials}
          imageUrl={post.author.avatarUrl}
          size="md"
          variant={post.author.id === '1' ? 'cyan' : post.author.id === '4' ? 'purple' : 'green'}
          onClick={(e) => { e.stopPropagation(); setShowMiniProfile(true) }}
        />
        <div className="flex-1 min-w-0">
          <div className="font-mono text-xs md:text-sm font-bold text-[var(--t1)] flex items-center gap-2">
            @{post.author.username}
            {post.author.isVerified && (
              <BadgeCheck size={12} className="text-[var(--accent)]" />
            )}
            {post.author.isSystem && (
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-[var(--accent)] bg-[rgba(99,102,241,0.08)] text-[var(--accent)] tracking-wider leading-none">
                AI CURATED
              </span>
            )}
          </div>
          <div className="font-mono text-xs md:text-[13px] text-[var(--t2)] mt-0.5 tracking-[0.04em]">
            {post.author.role} @ {post.author.company}
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="flex flex-col items-end gap-1">
            <span className="font-mono text-[10px] md:text-xs text-[var(--t2)] flex-shrink-0">{post.createdAt}</span>
            {activeTab === 'trending' && post.views && (
              <span className="font-mono text-[10px] text-[var(--orange)]">
                {post.views.toLocaleString()} views
              </span>
            )}
          </div>
          <OverflowMenu
            contentType="byte"
            contentId={post.id}
            isOwnContent={!!currentUserId && currentUserId === post.author.id}
            authorUserId={post.author.id}
            authorUsername={post.author.username}
            showBlock
            onBlocked={() => onAuthorBlocked?.(post.author.id)}
          />
        </div>
      </div>

      {/* Post title */}
      <h2 className="text-lg md:text-xl lg:text-2xl font-extrabold leading-tight tracking-tight">{post.title}</h2>

      {/* Post body */}
      <p className={`text-sm md:text-base leading-relaxed text-[var(--t2)] ${shouldTruncate ? 'line-clamp-3' : ''}`}>
        {renderMentions(post.body)}
      </p>

      {/* Code block */}
      {post.code && (
        <CodeBlock
          code={post.code.content}
          language={post.code.language}
          filename={post.code.filename}
          showLineNumbers={false}
          maxHeight={shouldTruncate ? '120px' : 'auto'}
        />
      )}

      {/* Tags */}
      <div className="flex gap-2 flex-wrap">
        {(post.tags ?? []).map((tag) => (
          <span
            key={tag}
            className="font-mono text-[10px] md:text-xs py-1 px-2.5 rounded-xl border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)] transition-all cursor-pointer hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:text-[var(--accent)] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(59,130,246,0.12)]"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Interaction Buttons */}
      <div className="flex items-center gap-2 pt-4 border-t border-[var(--border-h)]">
        <div className="flex items-center">
          <button
            onClick={() => onLike(post.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-l-lg font-mono text-[11px] md:text-xs tracking-[0.07em] transition-all ${
              post.isLiked
                ? 'text-[var(--accent)] bg-[var(--accent-d)] border border-[var(--accent)]'
                : 'text-[var(--t1)] bg-[rgba(59,130,246,0.03)] border border-[rgba(59,130,246,0.2)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:text-[var(--accent)]'
            }`}
          >
            <Heart size={14} fill={post.isLiked ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => setShowLikers(true)}
            className={`flex items-center px-2.5 py-2 rounded-r-lg font-mono text-[11px] md:text-xs tracking-[0.07em] transition-all border-t border-b border-r ${
              post.isLiked
                ? 'text-[var(--accent)] bg-[var(--accent-d)] border-[var(--accent)]'
                : 'text-[var(--t1)] bg-[rgba(59,130,246,0.03)] border-[rgba(59,130,246,0.2)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:text-[var(--accent)]'
            }`}
          >
            {post.likes || 0}
          </button>
        </div>

        {showLikers && (
          <LikersSheet
            byteId={post.id}
            likeCount={post.likes || 0}
            onClose={() => setShowLikers(false)}
          />
        )}

        <button
          onClick={() => router.push(`/post/${post.id}/comments`)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-[11px] md:text-xs tracking-[0.07em] text-[var(--t1)] bg-[rgba(59,130,246,0.03)] border border-[rgba(59,130,246,0.2)] transition-all hover:text-[var(--accent)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)]"
        >
          <MessageSquare size={14} />
          <span className="hidden sm:inline">{post.comments || 0}</span>
        </button>

        <button
          onClick={() => onBookmark(post.id)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-[11px] md:text-xs tracking-[0.07em] transition-all ${
            post.isBookmarked
              ? 'text-[var(--accent)] bg-[var(--accent-d)] border border-[var(--accent)]'
              : 'text-[var(--t1)] bg-[rgba(59,130,246,0.03)] border border-[rgba(59,130,246,0.2)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:text-[var(--accent)]'
          }`}
        >
          <Bookmark size={14} fill={post.isBookmarked ? 'currentColor' : 'none'} />
          <span className="hidden sm:inline">SAVE</span>
        </button>

        <button
          onClick={() => onShare(post.id)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-[11px] md:text-xs tracking-[0.07em] text-[var(--t1)] bg-[rgba(59,130,246,0.03)] border border-[rgba(59,130,246,0.2)] transition-all hover:text-[var(--accent)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)]"
        >
          <Share2 size={14} />
          <span className="hidden sm:inline">SHARE</span>
        </button>

        <button
          onClick={() => router.push(`/post/${post.id}`)}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-[10px] font-bold tracking-[0.1em] text-[var(--accent)] bg-[rgba(59,130,246,0.22)] border border-[rgba(59,130,246,0.6)] shadow-[0_0_10px_rgba(59,130,246,0.18)] transition-all hover:border-[var(--accent)] hover:shadow-[0_0_14px_rgba(59,130,246,0.25)] hover:-translate-y-0.5"
        >
          VIEW_FULL_BYTE
          <span>→</span>
        </button>
      </div>

      {showMiniProfile && (
        <UserMiniProfile
          userId={post.author.id}
          username={post.author.username}
          displayName={post.author.displayName}
          initials={post.author.initials}
          avatarUrl={post.author.avatarUrl}
          role={post.author.role}
          company={post.author.company}
          tags={post.tags ?? []}
          onClose={() => setShowMiniProfile(false)}
        />
      )}
      </div>
    </article>
  )
}
