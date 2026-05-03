"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Send, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar } from '@/components/layout/avatar'
import { CodeBlock } from '@/components/ui/code-block'
import { OverflowMenu } from '@/components/features/moderation/overflow-menu'
import { renderMentions } from '@/lib/utils/render-mentions'
import { addComment, getCurrentUser, deleteComment, getPostComments } from '@/lib/api'
import type { Comment, Post } from '@/lib/api'
import { ApiError, type ModerationReason } from '@/lib/api/http'
import { ErrorModal, resolveErrorModal } from '@/components/ui/error-modal'
import { getMeCache } from '@/lib/user-cache'

interface CommentsScreenProps {
  post: Post
}

function CommentCard({ comment: c, currentUserId, onDelete }: {
  comment: Comment
  currentUserId: string | null
  onDelete: (id: string) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const isOwn = c.author.id === 'me' || (currentUserId && c.author.id === currentUserId)

  return (
    <div className="flex gap-3">
      <Avatar initials={c.author.initials} imageUrl={c.author.avatarUrl} size="sm" />
      <div className="flex-1 min-w-0 border border-[var(--border-h)] rounded-xl bg-[var(--bg-card)] overflow-hidden">
        <div className="h-px bg-gradient-to-r from-[var(--accent)] via-[rgba(59,130,246,0.3)] to-transparent" />
        <div className="px-3 py-3 lg:px-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[11px] font-bold text-[var(--t1)]">@{c.author.username}</span>
            <span className="font-mono text-[10px] text-[var(--t2)]">{c.createdAt}</span>
            {c.votes > 0 && (
              <span className="font-mono text-[10px] font-bold text-[var(--accent)]">+{c.votes}</span>
            )}
            {isOwn ? (
              <div className="ml-auto flex items-center gap-1.5">
                {confirming ? (
                  <>
                    <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.05em]">DELETE?</span>
                    <button
                      onClick={() => { onDelete(c.id); setConfirming(false) }}
                      className="font-mono text-[10px] font-bold px-2.5 py-1 rounded-lg border border-[rgba(244,63,94,0.4)] bg-[rgba(244,63,94,0.08)] text-[var(--red)] hover:border-[rgba(244,63,94,0.7)] hover:bg-[rgba(244,63,94,0.15)] transition-all"
                    >
                      YES
                    </button>
                    <button
                      onClick={() => setConfirming(false)}
                      className="font-mono text-[10px] font-bold px-2.5 py-1 rounded-lg border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:text-[var(--accent)] transition-all"
                    >
                      NO
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setConfirming(true)}
                    title="Delete comment"
                    className="font-mono text-xs font-bold px-3 py-1.5 rounded-lg border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)] hover:border-[rgba(244,63,94,0.4)] hover:bg-[rgba(244,63,94,0.08)] hover:text-[var(--red)] transition-all tracking-[0.05em]"
                  >
                    rm
                  </button>
                )}
              </div>
            ) : (
              <div className="ml-auto">
                <OverflowMenu contentType="comment" contentId={c.id} isOwnContent={false} />
              </div>
            )}
          </div>
          <p className="text-sm leading-relaxed text-[var(--t2)]">{renderMentions(c.content)}</p>
          {c.badge && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[rgba(59,130,246,0.2)] bg-[var(--accent-d)] px-2.5 py-1 text-[var(--accent)] font-mono text-[10px]">
              {c.badge}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function CommentsScreen({ post }: CommentsScreenProps) {
  const router = useRouter()
  const meCache = getMeCache()
  const myAvatarUrl = meCache?.avatarUrl ?? null
  const myInitials = (meCache?.displayName?.[0] ?? meCache?.username?.[0] ?? 'U').toUpperCase()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [postError, setPostError] = useState<{ errorCode: string; reason?: string; reasons?: ModerationReason[] } | null>(null)

  useEffect(() => {
    getCurrentUser().then((u) => { if (u) setCurrentUserId(u.id) })
    getPostComments(post.id, {})
      .then(({ comments: loaded }) => setComments(loaded))
      .finally(() => setLoading(false))
  }, [post.id])

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      toast.success('Comment deleted')
    } catch {
      toast.error('Failed to delete comment')
    }
  }

  const handleSubmit = async () => {
    const trimmed = body.trim()
    if (!trimmed || isSubmitting) return

    setIsSubmitting(true)
    try {
      const { id: realId } = await addComment(post.id, trimmed)
      const optimistic: Comment = {
        id: realId,
        postId: post.id,
        author: {
          id: 'me',
          username: 'you',
          displayName: 'You',
          initials: 'Y',
          role: '',
          company: '',
          bio: '',
          level: 1,
          xp: 0,
          xpToNextLevel: 1000,
          followers: 0,
          following: 0,
          bytes: 0,
          reactions: 0,
          streak: 0,
          techStack: [],
          feedPreferences: [],
          links: [],
          badges: [],
          isVerified: false,
          isOnline: false,
        },
        content: trimmed,
        votes: 0,
        createdAt: 'just now',
      }
      setComments((prev) => [...prev, optimistic])
      setBody('')
      toast.success('Comment posted')
    } catch (err) {
      if (err instanceof ApiError) {
        setPostError({ errorCode: err.errorCode, reason: err.reason, reasons: err.reasons })
      } else {
        toast.error('Failed to post comment')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-h)] bg-[var(--bg-o92)] backdrop-blur-md flex-shrink-0">
        <button
          onClick={() => router.push('/feed')}
          className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--t1)] border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] rounded-lg px-3 py-1.5 transition-all hover:border-[rgba(59,130,246,0.45)] hover:text-[var(--accent)]"
        >
          <ChevronLeft size={12} /> BACK TO FEED
        </button>
        <span className="font-mono text-[10px] text-[var(--accent)] bg-[var(--accent-d)] border border-[rgba(59,130,246,0.2)] px-2.5 py-1 rounded-lg">
          COMMENTS
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">
        <div className="px-4 py-4 flex flex-col gap-4">

          {/* Post summary */}
          <div className="rounded-xl border border-[var(--border-h)] bg-[var(--bg-card)] overflow-hidden">
            <div className="h-px bg-gradient-to-r from-[var(--accent)] via-[rgba(59,130,246,0.3)] to-transparent" />
            <div className="p-4 lg:p-5 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Avatar initials={post.author.initials} imageUrl={post.author.avatarUrl} size="md" />
                <div>
                  <div className="font-mono text-xs font-bold text-[var(--t1)] flex items-center gap-2">
                    @{post.author.username}
                    {post.author.isVerified && (
                      <span className="text-[10px] text-[var(--accent)]">✦</span>
                    )}
                  </div>
                  {(post.author.role || post.author.company) && (
                    <div className="font-mono text-[10px] text-[var(--t2)] mt-0.5 tracking-[0.04em]">
                      {post.author.role}{post.author.role && post.author.company ? ' @ ' : ''}{post.author.company}
                    </div>
                  )}
                </div>
              </div>

              <h1 className="text-lg lg:text-xl font-extrabold tracking-tight leading-tight">{post.title}</h1>
              <p className="text-sm leading-relaxed text-[var(--t2)]">{post.body}</p>

              {post.code && (
                <CodeBlock
                  code={post.code.content}
                  language={post.code.language}
                  filename={post.code.filename}
                  showLineNumbers={false}
                  maxHeight="160px"
                />
              )}

              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span key={tag} className="font-mono text-[10px] py-1 px-2.5 rounded-xl border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)]">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Discussion section */}
          <div className="flex flex-col gap-3">
            {/* Accent-bar header */}
            <div className="flex items-center gap-2">
              <span className="w-[3px] h-4 rounded-full bg-[var(--accent)]" />
              <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.05em]">DISCUSSION</span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-lg border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.05)] text-[var(--accent)]">
                {comments.length}
              </span>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
              </div>
            ) : comments.length > 0 ? (
              comments.map((comment) => (
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  currentUserId={currentUserId}
                  onDelete={handleDeleteComment}
                />
              ))
            ) : (
              <div className="border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] rounded-xl px-5 py-8 text-center flex flex-col items-center gap-2">
                <MessageSquare size={20} className="text-[var(--accent)] opacity-50" />
                <p className="font-mono text-xs font-bold text-[var(--t1)]">NO COMMENTS YET</p>
                <p className="text-xs text-[var(--t2)]">Be the first to add a comment.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comment compose — pinned to bottom */}
      <div className="flex-shrink-0 border-t border-[var(--border-h)] bg-[var(--bg-o95)] backdrop-blur-md px-4 py-3">
        <div className="flex items-center gap-2">
          <Avatar initials={myInitials} imageUrl={myAvatarUrl} size="xs" />
          <div className="flex-1 flex items-center bg-[rgba(59,130,246,0.04)] border border-[rgba(59,130,246,0.2)] rounded-full px-4 py-2.5 transition-all focus-within:border-[var(--accent)] focus-within:bg-[rgba(59,130,246,0.07)]">
            <input
              type="text"
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 500))}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Add a comment..."
              className="flex-1 bg-transparent text-sm text-[var(--t1)] outline-none placeholder:text-[var(--t2)]"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!body.trim() || isSubmitting}
            aria-label="POST"
            className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent)] to-[#1d4ed8] flex items-center justify-center text-white flex-shrink-0 shadow-[0_4px_16px_var(--accent-glow)] transition-all hover:shadow-[0_6px_24px_var(--accent-glow)] hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            <Send size={14} />
          </button>
        </div>
      </div>

      {/* Post error modal — moderation rejections preserve the draft */}
      {postError && (
        <ErrorModal
          {...resolveErrorModal(postError.errorCode, postError.reason)}
          reasons={postError.reasons}
          onClose={() => setPostError(null)}
        />
      )}
    </div>
  )
}
