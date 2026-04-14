"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar } from '@/components/layout/avatar'
import { addComment, getCurrentUser, deleteComment, getPostComments } from '@/lib/api'
import type { Comment, Post } from '@/lib/api'

interface CommentsScreenProps {
  post: Post
}

export function CommentsScreen({ post }: CommentsScreenProps) {
  const router = useRouter()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

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
      await addComment(post.id, trimmed)
      // Optimistically add to the list
      const optimistic: Comment = {
        id: crypto.randomUUID(),
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
    } catch {
      toast.error('Failed to post comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 lg:px-6 lg:py-4 border-b border-[var(--border)] bg-[var(--bg-o92)] backdrop-blur-md flex-shrink-0">
        <button
          onClick={() => router.push('/feed')}
          className="flex items-center gap-1 font-mono text-[9px] lg:text-[10px] text-[var(--t2)] border border-[var(--border-m)] rounded-full px-3 py-2 transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <ChevronLeft size={12} /> BACK TO FEED
        </button>
        <span className="font-mono text-[8px] lg:text-[9px] text-[var(--green)] bg-[var(--green-d)] border border-[rgba(16,217,160,0.2)] px-2 py-[3px] rounded shadow-[0_0_8px_rgba(16,217,160,0.08)]">
          COMMENTS
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">
        <div className="max-w-4xl mx-auto px-4 py-5 lg:px-8 lg:py-6 flex flex-col gap-5">

          {/* Post summary */}
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-el)] p-5 lg:p-6">
            <div className="flex items-center gap-3 mb-4">
              <Avatar
                initials={post.author.initials}
                imageUrl={post.author.avatarUrl}
                size="md"
              />
              <div>
                <div className="font-mono text-xs lg:text-sm font-bold text-[var(--t1)] flex items-center gap-2">
                  @{post.author.username}
                  {post.author.isVerified && (
                    <span className="text-[9px] text-[var(--accent)]">✦</span>
                  )}
                </div>
                {(post.author.role || post.author.company) && (
                  <div className="font-mono text-[8px] lg:text-[10px] text-[var(--t2)] mt-1 tracking-[0.04em]">
                    {post.author.role}{post.author.role && post.author.company ? ' @ ' : ''}{post.author.company}
                  </div>
                )}
              </div>
            </div>
            <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight leading-tight mb-3">{post.title}</h1>
            <p className="text-sm lg:text-base leading-relaxed text-[var(--t2)]">{post.body}</p>
            {post.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span key={tag} className="font-mono text-[8px] lg:text-[9px] py-1 px-2 rounded-full border border-[var(--border-m)] text-[var(--t2)] bg-[var(--bg)]">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Comment list */}
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-el)] p-5 lg:p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-mono text-[8px] lg:text-[9px] tracking-[0.2em] text-[var(--t2)] mb-1">DISCUSSION THREAD</p>
                <h2 className="font-mono text-lg lg:text-xl font-bold text-[var(--t1)]">
                  {comments.length} COMMENT{comments.length === 1 ? '' : 'S'}
                </h2>
              </div>
              <span className="font-mono text-[9px] lg:text-[10px] text-[var(--accent)]">SORT: TOP ↓</span>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
                </div>
              ) : comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar initials={comment.author.initials} imageUrl={comment.author.avatarUrl} size="sm" />
                        <div>
                          <p className="font-mono text-[10px] lg:text-[11px] font-bold text-[var(--t1)]">@{comment.author.username}</p>
                          <p className="font-mono text-[8px] lg:text-[9px] text-[var(--t3)]">{comment.createdAt}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {comment.votes > 0 && (
                          <span className="font-mono text-[9px] lg:text-[10px] text-[var(--green)]">+{comment.votes}</span>
                        )}
                        {(comment.author.id === 'me' || (currentUserId && comment.author.id === currentUserId)) && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="p-1.5 rounded-lg text-[var(--t3)] hover:text-[var(--red)] hover:bg-[rgba(244,63,94,0.08)] transition-all"
                            title="Delete comment"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="font-mono text-[11px] lg:text-sm leading-relaxed text-[var(--t2)]">{comment.content}</p>
                    {comment.badge && (
                      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--accent)] bg-[rgba(59,130,246,0.08)] px-3 py-2 text-[var(--accent)] text-[10px]">
                        {comment.badge}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-center text-[var(--t2)]">
                  <p className="font-mono text-[11px] lg:text-sm">
                    No comments yet. Add the first insight and keep the conversation going.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Comment compose — pinned to bottom */}
      <div className="flex-shrink-0 border-t border-[var(--border)] bg-[var(--bg-o95)] backdrop-blur-md px-4 py-3 lg:px-8 lg:py-4">
        <div className="max-w-4xl mx-auto flex items-end gap-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 500))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
            }}
            placeholder="Add your thoughts..."
            rows={2}
            className="flex-1 bg-[var(--bg-el)] border border-[var(--border-m)] rounded-2xl px-4 py-3 font-mono text-[11px] lg:text-xs text-[var(--t1)] outline-none resize-none placeholder:text-[var(--t3)] transition-all focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)]"
          />
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="font-mono text-[8px] text-[var(--t3)]">{body.length}/500</span>
            <button
              onClick={handleSubmit}
              disabled={!body.trim() || isSubmitting}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-br from-[var(--accent)] to-[#1d4ed8] rounded-2xl font-mono text-[10px] font-bold text-white shadow-[0_4px_16px_var(--accent-glow)] transition-all hover:shadow-[0_6px_24px_var(--accent-glow)] hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              <Send size={12} />
              {isSubmitting ? 'POSTING...' : 'POST'}
            </button>
          </div>
        </div>
        <p className="max-w-4xl mx-auto font-mono text-[8px] text-[var(--t3)] mt-1.5">⌘ + Enter to post</p>
      </div>
    </div>
  )
}
