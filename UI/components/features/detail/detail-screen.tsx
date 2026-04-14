"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bookmark, Share2, Heart, MessageSquare, ChevronLeft, ChevronRight, Send, Trash2, Layers, X, Pencil } from 'lucide-react'
import { CodeEditor } from '@/components/ui/code-editor'
import { toast } from 'sonner'
import { PhoneFrame } from '@/components/layout/phone-frame'
import { Avatar } from '@/components/layout/avatar'
import { CodeBlock } from '@/components/ui/code-block'
import { LikersSheet } from '@/components/ui/likers-sheet'
import * as api from '@/lib/api'
import type { Post, Comment } from '@/lib/api'
import { getMeCache } from '@/lib/user-cache'
import { useUser } from '@clerk/nextjs'

interface DetailScreenProps {
  post: Post
}

export function DetailScreen({ post }: DetailScreenProps) {
  const router = useRouter()
  const { user: clerkUser } = useUser()
  const meCache = getMeCache()
  const myAvatarUrl = meCache?.avatarUrl || clerkUser?.imageUrl || null
  const myInitials = ((clerkUser?.firstName?.[0] ?? '') + (clerkUser?.lastName?.[0] ?? '')).toUpperCase()
    || meCache?.username?.[0]?.toUpperCase() || 'U'
  const [comments, setComments] = useState<Comment[]>([])
  const [commentCount, setCommentCount] = useState(post.comments ?? 0)
  const [likeCount, setLikeCount] = useState(post.likes ?? 0)
  const [isLiked, setIsLiked] = useState(post.isLiked ?? false)
  const [showLikers, setShowLikers] = useState(false)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked ?? false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  type FeedItem = { id: string; title: string; username: string; role: string; company: string }
  const [prevPost, setPrevPost] = useState<FeedItem | null>(null)
  const [nextPost, setNextPost] = useState<FeedItem | null>(null)

  // EDIT
  const [showEdit, setShowEdit] = useState(false)
  const [editTitle, setEditTitle] = useState(post.title)
  const [editBody, setEditBody] = useState(post.body)
  const [editCode, setEditCode] = useState(post.code?.content ?? '')
  const [editLanguage, setEditLanguage] = useState(post.code?.language ?? 'JS')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    api.getCurrentUser().then((u) => { if (u) setCurrentUserId(u.id) })

    try {
      const raw = sessionStorage.getItem('byteai_feed_context')
      if (raw) {
        const feed: FeedItem[] = JSON.parse(raw)
        const idx = feed.findIndex((p) => p.id === post.id)
        if (idx > 0) setPrevPost(feed[idx - 1])
        if (idx !== -1 && idx < feed.length - 1) setNextPost(feed[idx + 1])
      }
    } catch { /* sessionStorage unavailable */ }
    api.getPostComments(post.id, {}).then(({ comments: loaded }) => {
      setComments(loaded)
      setCommentCount(loaded.length)
    })
  }, [post.id])

  const handleAddComment = async () => {
    const trimmed = comment.trim()
    if (!trimmed || isSubmitting) return

    setIsSubmitting(true)
    try {
      await api.addComment(post.id, trimmed)
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
      setCommentCount((c) => c + 1)
      setComment('')
      toast.success('Comment posted!')
    } catch {
      toast.error('Failed to post comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVoteComment = async (commentId: string, direction: 'up' | 'down') => {
    await api.voteComment(commentId, direction)
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.deleteComment(commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      setCommentCount((n) => n - 1)
      toast.success('Comment deleted')
    } catch {
      toast.error('Failed to delete comment')
    }
  }

  const handleBookmark = async () => {
    const { isSaved } = await api.toggleBookmark(post.id, post.type === 'interview' ? 'interview' : 'byte')
    setIsBookmarked(isSaved)
    toast.success(isSaved ? 'Saved to bookmarks' : 'Removed from bookmarks')
  }

  const handleShare = async () => {
    await api.sharePost(post.id)
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`)
      toast.success('Link copied')
    }
  }

  const handleSaveEdit = async () => {
    const t = editTitle.trim()
    const b = editBody.trim()
    if (!t || !b || isSaving) return
    setIsSaving(true)
    try {
      const res = await api.updatePost(post.id, { title: t, body: b, codeSnippet: editCode || undefined, language: editLanguage })
      if (res.error === 'INVALID_CONTENT') {
        toast.error(res.reason ?? 'Content rejected')
        return
      }
      toast.success('Byte updated!')
      setShowEdit(false)
      router.refresh()
    } catch {
      toast.error('Failed to save changes')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <PhoneFrame>
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 lg:px-6 lg:py-4 border-b border-[var(--border)] flex-shrink-0 bg-[var(--bg-o92)] backdrop-blur-md">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 font-mono text-[9px] lg:text-[10px] text-[var(--t2)] px-[10px] py-[5px] rounded-md border border-[var(--border-m)] bg-[var(--bg-el)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] hover:-translate-x-px"
        >
          <ChevronLeft size={12} /> BACK
        </button>
        <span className="font-mono text-[8px] text-[var(--green)] bg-[var(--green-d)] border border-[rgba(16,217,160,0.2)] px-2 py-[3px] rounded">
          v1.0.4
        </span>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">
        <div className="px-4 py-4 lg:px-8 lg:py-6 flex flex-col gap-4 lg:gap-5 max-w-4xl mx-auto">
          {/* Author */}
          <div className="flex items-center gap-3">
            <Avatar
              initials={post.author.initials}
              imageUrl={post.author.avatarUrl}
              size="md"
            />
            <div>
              <div className="font-mono text-xs lg:text-sm font-bold text-[var(--t1)] flex items-center gap-1.5">
                @{post.author.username}
                {post.author.isVerified && (
                  <span className="text-[9px] text-[var(--accent)]">✦</span>
                )}
              </div>
              {(post.author.role || post.author.company) && (
                <div className="font-mono text-[8px] lg:text-[10px] text-[var(--t2)] mt-[3px] tracking-[0.04em]">
                  {post.author.role}{post.author.role && post.author.company ? ' @ ' : ''}{post.author.company}
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-xl lg:text-2xl xl:text-3xl font-extrabold leading-tight tracking-tight">{post.title}</h1>

          {/* Body */}
          <p className="text-sm lg:text-base leading-relaxed text-[var(--t2)]">{post.body}</p>

          {/* Code block */}
          {post.code && (
            <CodeBlock
              code={post.code.content}
              language={post.code.language}
              filename={post.code.filename}
              showLineNumbers={true}
              maxHeight="auto"
            />
          )}

          {/* Tags */}
          <div className="flex gap-[5px] lg:gap-2 flex-wrap">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="font-mono text-[8px] lg:text-[10px] py-[3px] px-2 lg:px-3 rounded border border-[var(--border-m)] text-[var(--t2)] bg-[var(--bg-el)] transition-all cursor-pointer hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-d)]"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Reactions */}
          <div className="flex gap-2 lg:gap-3 flex-wrap py-3 lg:py-4 border-t border-b border-[var(--border)]">
            {/* Like button + count */}
            <div className="flex items-center">
              <button
                onClick={async () => {
                  const { isLiked: nowLiked } = await api.toggleLike(post.id)
                  setIsLiked(nowLiked)
                  setLikeCount((c) => Math.max(0, c + (nowLiked ? 1 : -1)))
                }}
                className={`flex items-center gap-[5px] py-1.5 lg:py-2 px-3 lg:px-4 border rounded-l-full bg-[var(--bg-el)] font-mono text-[8px] lg:text-[10px] transition-all ${
                  isLiked
                    ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-d)]'
                    : 'border-[var(--border-m)] text-[var(--t2)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-d)]'
                }`}
              >
                <Heart size={12} fill={isLiked ? 'currentColor' : 'none'} />
                LIKE
              </button>
              <button
                onClick={() => likeCount > 0 && setShowLikers(true)}
                className={`flex items-center px-2.5 py-1.5 lg:py-2 border-t border-b border-r rounded-r-full bg-[var(--bg-el)] font-mono text-[8px] lg:text-[10px] transition-all ${
                  isLiked
                    ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-d)]'
                    : 'border-[var(--border-m)] text-[var(--t2)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-d)]'
                } ${likeCount === 0 ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <span className="font-bold text-[10px] lg:text-xs text-[var(--t1)]">{likeCount}</span>
              </button>
            </div>

            <button
              onClick={handleShare}
              className="flex items-center gap-[5px] py-1.5 lg:py-2 px-3 lg:px-4 border rounded-full bg-[var(--bg-el)] font-mono text-[8px] lg:text-[10px] transition-all border-[var(--border-m)] text-[var(--t2)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-d)]"
            >
              <Share2 size={12} /> SHARE
            </button>

            <button
              onClick={handleBookmark}
              className={`flex items-center gap-[5px] py-1.5 lg:py-2 px-3 lg:px-4 border rounded-full bg-[var(--bg-el)] font-mono text-[8px] lg:text-[10px] transition-all ${
                isBookmarked
                  ? 'border-[var(--green)] text-[var(--green)] bg-[rgba(16,217,160,0.1)]'
                  : 'border-[var(--border-m)] text-[var(--t2)] hover:border-[var(--green)] hover:text-[var(--green)] hover:bg-[rgba(16,217,160,0.1)]'
              }`}
            >
              <Bookmark size={12} fill={isBookmarked ? 'currentColor' : 'none'} />
              {isBookmarked ? 'SAVED' : 'SAVE'}
            </button>

            <button
              onClick={() => router.push(`/search?byteId=${post.id}&type=bytes`)}
              className="flex items-center gap-[5px] py-1.5 lg:py-2 px-3 lg:px-4 border rounded-full bg-[var(--bg-el)] font-mono text-[8px] lg:text-[10px] transition-all border-[var(--border-m)] text-[var(--t2)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-d)]"
            >
              <Layers size={12} /> SIMILAR
            </button>

            {currentUserId && post.author.id === currentUserId && (
              <button
                onClick={() => { setShowEdit((v) => !v); setEditTitle(post.title); setEditBody(post.body); setEditCode(post.code?.content ?? ''); setEditLanguage(post.code?.language ?? 'JS') }}
                className={`flex items-center gap-[5px] py-1.5 lg:py-2 px-3 lg:px-4 border rounded-full bg-[var(--bg-el)] font-mono text-[8px] lg:text-[10px] transition-all ${
                  showEdit
                    ? 'border-[var(--green)] text-[var(--green)] bg-[rgba(16,217,160,0.1)]'
                    : 'border-[var(--border-m)] text-[var(--t2)] hover:border-[var(--green)] hover:text-[var(--green)] hover:bg-[rgba(16,217,160,0.1)]'
                }`}
              >
                <Pencil size={12} /> EDIT
              </button>
            )}
          </div>

          {/* EDIT panel */}
          {showEdit && (
            <div className="rounded-xl border border-[var(--green)] bg-[rgba(16,217,160,0.05)] p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="font-mono text-[9px] lg:text-[10px] font-bold tracking-[0.1em] text-[var(--green)] flex items-center gap-1.5">
                  <Pencil size={11} /> EDIT BYTE
                </div>
                <button onClick={() => setShowEdit(false)} className="text-[var(--t3)] hover:text-[var(--t1)]">
                  <X size={13} />
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value.slice(0, 120))}
                  placeholder="Title"
                  className="w-full bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg py-2 px-3 font-mono text-[11px] text-[var(--t1)] outline-none placeholder:text-[var(--t3)] focus:border-[var(--green)]"
                />
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value.slice(0, 1000))}
                  placeholder="Body"
                  rows={5}
                  className="w-full bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg py-2 px-3 font-mono text-[11px] text-[var(--t1)] outline-none resize-none placeholder:text-[var(--t3)] focus:border-[var(--green)]"
                />
                {/* Code snippet */}
                <CodeEditor
                  value={editCode}
                  language={editLanguage}
                  onChange={setEditCode}
                  onLanguageChange={setEditLanguage}
                />
              </div>
              <button
                onClick={handleSaveEdit}
                disabled={!editTitle.trim() || !editBody.trim() || isSaving}
                className="self-end px-5 py-2 rounded-lg bg-[var(--green)] text-black font-mono text-[10px] font-bold tracking-[0.08em] transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSaving ? 'SAVING...' : 'SAVE CHANGES'}
              </button>
            </div>
          )}

          {showLikers && (
            <LikersSheet
              byteId={post.id}
              likeCount={likeCount}
              onClose={() => setShowLikers(false)}
            />
          )}

          {/* Discussion */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="font-mono text-[8px] lg:text-[10px] font-bold tracking-[0.12em] text-[var(--t2)] flex items-center gap-1.5">
                <MessageSquare size={12} /> DISCUSSION
                <span className="bg-[var(--bg-el)] border border-[var(--border-m)] rounded-full px-[7px] py-px text-[7px] lg:text-[8px] text-[var(--t1)]">
                  {commentCount}
                </span>
              </div>
              <button className="font-mono text-[8px] lg:text-[9px] text-[var(--accent)]">
                SORT: TOP ↓
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {comments.length > 0 ? (
                comments.map((c) => (
                  <div key={c.id} className="flex gap-[10px] lg:gap-4">
                    <Avatar initials={c.author.initials} imageUrl={c.author.avatarUrl} size="xs" />
                    <div className="flex-1 min-w-0 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-[10px] lg:px-4 lg:py-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="font-mono text-[10px] lg:text-xs font-bold text-[var(--t1)]">@{c.author.username}</span>
                        {c.badge && (
                          <span className="font-mono text-[6px] lg:text-[8px] px-1.5 py-0.5 rounded-sm bg-[var(--accent-d)] text-[var(--accent)] border border-[rgba(59,130,246,0.18)]">
                            {c.badge}
                          </span>
                        )}
                        {c.votes > 0 && (
                          <span className="font-mono text-[9px] font-bold text-[var(--green)]">+{c.votes}</span>
                        )}
                        {(c.author.id === 'me' || (currentUserId && c.author.id === currentUserId)) && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="ml-auto p-1 rounded text-[var(--t3)] hover:text-[var(--red)] hover:bg-[rgba(244,63,94,0.08)] transition-all"
                            title="Delete comment"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] lg:text-sm leading-relaxed text-[var(--t2)]">{c.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-el)] px-4 py-6 text-center text-[var(--t2)]">
                  <p className="font-mono text-[11px] lg:text-sm">No comments yet. Be the first to add insight on this byte.</p>
                </div>
              )}
            </div>

            {/* Prev / Next navigation */}
            {(prevPost || nextPost) && (
              <div className="flex flex-col gap-2 mt-4">
                {prevPost && (
                  <button
                    onClick={() => router.push(`/post/${prevPost.id}`)}
                    className="flex items-center gap-[14px] px-[17px] py-[15px] lg:px-6 lg:py-5 bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg transition-all hover:border-[var(--border)] hover:shadow-[0_0_20px_rgba(59,130,246,0.08)] hover:-translate-y-0.5 group w-full text-left"
                  >
                    <span className="font-mono text-[18px] lg:text-2xl text-[var(--t3)] transition-all group-hover:-translate-x-1">←</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[7px] lg:text-[9px] tracking-[0.1em] text-[var(--t3)] mb-1">PREV</div>
                      <div className="font-mono text-[10px] lg:text-sm font-bold text-[var(--t1)] truncate">{prevPost.title}</div>
                      {(prevPost.username || prevPost.role || prevPost.company) && (
                        <div className="font-mono text-[8px] lg:text-[10px] text-[var(--t2)] mt-0.5">
                          {prevPost.username && `@${prevPost.username}`}{prevPost.role ? ` · ${prevPost.role}` : ''}{prevPost.company ? ` @ ${prevPost.company}` : ''}
                        </div>
                      )}
                    </div>
                    <ChevronLeft size={16} className="text-[var(--t3)] flex-shrink-0" />
                  </button>
                )}
                {nextPost && (
                  <button
                    onClick={() => router.push(`/post/${nextPost.id}`)}
                    className="flex items-center gap-[14px] px-[17px] py-[15px] lg:px-6 lg:py-5 bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg transition-all hover:border-[var(--accent)] hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] hover:-translate-y-0.5 group w-full text-left"
                  >
                    <span className="text-2xl lg:text-3xl">🚀</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[7px] lg:text-[9px] tracking-[0.1em] text-[var(--t3)] mb-1">UP_NEXT</div>
                      <div className="font-mono text-[10px] lg:text-sm font-bold text-[var(--t1)] truncate">{nextPost.title}</div>
                      {(nextPost.username || nextPost.role || nextPost.company) && (
                        <div className="font-mono text-[8px] lg:text-[10px] text-[var(--t2)] mt-0.5">
                          {nextPost.username && `@${nextPost.username}`}{nextPost.role ? ` · ${nextPost.role}` : ''}{nextPost.company ? ` @ ${nextPost.company}` : ''}
                        </div>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-[var(--accent)] flex-shrink-0 transition-all group-hover:translate-x-1" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comment input */}
      <div className="flex items-center gap-2 px-3 py-2 lg:px-6 lg:py-3 border-t border-[var(--border)] bg-[var(--bg-card)] flex-shrink-0">
        <Avatar initials={myInitials} imageUrl={myAvatarUrl} size="xs" />
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
          placeholder="Write a comment..."
          className="flex-1 bg-transparent font-mono text-[10px] lg:text-sm text-[var(--t1)] outline-none placeholder:text-[var(--t3)]"
        />
        <button
          onClick={handleAddComment}
          disabled={!comment.trim() || isSubmitting}
          className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-mono text-sm lg:text-base transition-all hover:bg-[var(--accent)]/80 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={14} />
        </button>
      </div>
    </PhoneFrame>
  )
}
