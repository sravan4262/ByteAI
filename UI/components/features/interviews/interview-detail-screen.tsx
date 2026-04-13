"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Briefcase, ChevronLeft, Bookmark, Share2, ChevronsUpDown, ChevronsDownUp, MessageSquare, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PhoneFrame } from '@/components/layout/phone-frame'
import { Avatar } from '@/components/layout/avatar'
import * as api from '@/lib/api'
import type { InterviewWithQuestions, InterviewQuestion, InterviewComment } from '@/lib/api'

function difficultyColor(d: string) {
  if (d === 'easy') return 'text-[var(--green)] border-[rgba(16,217,160,0.3)] bg-[rgba(16,217,160,0.06)]'
  if (d === 'hard') return 'text-[var(--red)] border-[rgba(244,63,94,0.3)] bg-[rgba(244,63,94,0.06)]'
  return 'text-[var(--orange)] border-[rgba(251,146,60,0.3)] bg-[rgba(251,146,60,0.06)]'
}

function QuestionItem({
  q,
  index,
  expanded,
  onToggle,
}: {
  q: InterviewQuestion
  index: number
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="border border-[var(--border-m)] rounded-lg overflow-hidden bg-[var(--bg-el)]">
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[rgba(255,255,255,0.02)] transition-all"
      >
        <span className="font-mono text-[9px] text-[var(--purple)] bg-[rgba(167,139,250,0.12)] border border-[rgba(167,139,250,0.2)] rounded px-2 py-1 flex-shrink-0 mt-0.5">
          Q{index + 1}
        </span>
        <p className="flex-1 text-sm md:text-base font-semibold text-[var(--t1)] leading-relaxed">{q.question}</p>
        <span className="text-[var(--t3)] flex-shrink-0 mt-1">
          {expanded
            ? <ChevronsDownUp size={14} className="text-[var(--accent)]" />
            : <ChevronsUpDown size={14} />}
        </span>
      </button>

      {expanded && (
        <div className="px-4 py-3 border-t border-[var(--border)]">
          <p className="text-sm md:text-[15px] text-[var(--t2)] leading-relaxed whitespace-pre-wrap">{q.answer}</p>
        </div>
      )}
    </div>
  )
}

export function InterviewDetailScreen({ interview }: { interview: InterviewWithQuestions }) {
  const router = useRouter()
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const allExpanded = interview.questions.length > 0 && expandedIds.size === interview.questions.length

  // Comments
  const [comments, setComments] = useState<InterviewComment[]>([])
  const [commentBody, setCommentBody] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    api.getCurrentUser().then((u) => { if (u) setCurrentUserId(u.id) })
    api.getInterviewComments(interview.id).then(setComments)
  }, [interview.id])

  const toggleQuestion = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (allExpanded) setExpandedIds(new Set())
    else setExpandedIds(new Set(interview.questions.map((q) => q.id)))
  }

  const handleBookmark = async () => {
    const { isSaved } = await api.toggleBookmark(interview.id, 'interview')
    setIsBookmarked(isSaved)
    toast.success(isSaved ? 'Saved to bookmarks' : 'Removed from bookmarks')
  }

  const handleShare = async () => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied')
    }
  }

  const handleAddComment = async () => {
    const trimmed = commentBody.trim()
    if (!trimmed || isSubmitting) return
    setIsSubmitting(true)
    try {
      await api.addInterviewComment(interview.id, trimmed)
      const optimistic: InterviewComment = {
        id: crypto.randomUUID(),
        body: trimmed,
        authorId: currentUserId ?? 'me',
        voteCount: 0,
        createdAt: new Date().toISOString(),
      }
      setComments((prev) => [...prev, optimistic])
      setCommentBody('')
      toast.success('Comment posted')
    } catch {
      toast.error('Failed to post comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.deleteInterviewComment(interview.id, commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      toast.success('Comment deleted')
    } catch {
      toast.error('Failed to delete comment')
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
        <span className={`font-mono text-[9px] px-2.5 py-1 rounded border ${difficultyColor(interview.difficulty)}`}>
          {interview.difficulty.toUpperCase()}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">
        <div className="px-4 py-4 lg:px-8 lg:py-6 flex flex-col gap-4 lg:gap-5 max-w-4xl mx-auto">

          {/* Author */}
          <div className="flex items-center gap-3">
            <Avatar initials={interview.authorId.slice(0, 1).toUpperCase()} size="md" variant="purple" />
            <div>
              <div className="font-mono text-xs lg:text-sm font-bold text-[var(--t1)]">
                @{interview.authorId.slice(0, 8)}
              </div>
              <div className="font-mono text-[8px] lg:text-[10px] text-[var(--t2)] mt-[3px] tracking-[0.04em]">
                {interview.role ?? ''}
                {interview.role && interview.company ? ' @ ' : ''}
                {interview.company ?? ''}
              </div>
            </div>
            <span className="ml-auto font-mono text-[9px] text-[var(--t3)]">
              {new Date(interview.createdAt).toLocaleDateString()}
            </span>
          </div>

          {/* Type badge */}
          <span className="font-mono text-[9px] text-[var(--purple)] bg-[rgba(167,139,250,0.1)] border border-[rgba(167,139,250,0.2)] px-2.5 py-1 rounded flex items-center gap-1.5 w-fit">
            <Briefcase size={10} /> INTERVIEW
          </span>

          {/* Title */}
          <h1 className="text-xl lg:text-2xl xl:text-3xl font-extrabold leading-tight tracking-tight -mt-2">
            {interview.title}
          </h1>

          {/* Questions */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="font-mono text-[9px] tracking-[0.1em] text-[var(--t3)]">
                // {interview.questions.length} QUESTION{interview.questions.length !== 1 ? 'S' : ''}
              </div>
              <button
                onClick={toggleAll}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[9px] tracking-[0.07em] border transition-all ${
                  allExpanded
                    ? 'text-[var(--accent)] border-[var(--accent)] bg-[var(--accent-d)]'
                    : 'text-[var(--t3)] border-[var(--border-m)] hover:text-[var(--t1)] hover:border-[var(--border-h)]'
                }`}
              >
                {allExpanded
                  ? <><ChevronsDownUp size={11} /> COLLAPSE ALL</>
                  : <><ChevronsUpDown size={11} /> EXPAND ALL</>}
              </button>
            </div>
            {interview.questions.map((q, i) => (
              <QuestionItem
                key={q.id}
                q={q}
                index={i}
                expanded={expandedIds.has(q.id)}
                onToggle={() => toggleQuestion(q.id)}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
            <button
              onClick={handleBookmark}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-[11px] md:text-xs tracking-[0.07em] transition-all ${
                isBookmarked
                  ? 'text-[var(--accent)] bg-[var(--accent-d)] border border-[var(--accent)]'
                  : 'text-[var(--t2)] bg-[var(--bg-el)] border border-[var(--border-m)] hover:text-[var(--accent)] hover:border-[var(--accent)]'
              }`}
            >
              <Bookmark size={14} fill={isBookmarked ? 'currentColor' : 'none'} />
              {isBookmarked ? 'SAVED' : 'SAVE'}
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-[11px] md:text-xs tracking-[0.07em] text-[var(--t2)] bg-[var(--bg-el)] border border-[var(--border-m)] transition-all hover:text-[var(--green)] hover:border-[var(--green)]"
            >
              <Share2 size={14} /> SHARE
            </button>
          </div>

          {/* Discussion */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-4">
              <div className="font-mono text-[8px] lg:text-[10px] font-bold tracking-[0.12em] text-[var(--t2)] flex items-center gap-1.5">
                <MessageSquare size={12} /> DISCUSSION
                <span className="bg-[var(--bg-el)] border border-[var(--border-m)] rounded-full px-[7px] py-px text-[7px] lg:text-[8px] text-[var(--t1)]">
                  {comments.length}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {comments.length > 0 ? (
                comments.map((c) => (
                  <div key={c.id} className="flex gap-[10px] lg:gap-4">
                    <div className="w-[30px] h-[30px] lg:w-10 lg:h-10 rounded-full border border-[var(--border-m)] flex-shrink-0 flex items-center justify-center font-mono text-[8px] lg:text-[10px] font-bold bg-gradient-to-br from-[#1a1f2f] to-[#16243f] text-[var(--accent)]">
                      U
                    </div>
                    <div className="flex-1 min-w-0 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-[10px] lg:px-4 lg:py-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="font-mono text-[10px] lg:text-xs font-bold text-[var(--t1)]">@user</span>
                        <span className="font-mono text-[8px] text-[var(--t3)]">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                        {(c.authorId === 'me' || (currentUserId && c.authorId === currentUserId)) && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="ml-auto p-1 rounded text-[var(--t3)] hover:text-[var(--red)] hover:bg-[rgba(244,63,94,0.08)] transition-all"
                            title="Delete comment"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] lg:text-sm leading-relaxed text-[var(--t2)]">{c.body}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-el)] px-4 py-6 text-center text-[var(--t2)]">
                  <p className="font-mono text-[11px] lg:text-sm">No comments yet. Be the first to add insight.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Comment input — pinned to bottom */}
      <div className="flex items-center gap-2 px-3 py-2 lg:px-6 lg:py-3 border-t border-[var(--border)] bg-[var(--bg-card)] flex-shrink-0">
        <Avatar initials="U" size="xs" />
        <input
          type="text"
          value={commentBody}
          onChange={(e) => setCommentBody(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
          placeholder="Write a comment..."
          className="flex-1 bg-transparent font-mono text-[10px] lg:text-sm text-[var(--t1)] outline-none placeholder:text-[var(--t3)]"
        />
        <button
          onClick={handleAddComment}
          disabled={!commentBody.trim() || isSubmitting}
          className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-[var(--accent)] flex items-center justify-center text-white transition-all hover:bg-[var(--accent)]/80 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={14} />
        </button>
      </div>
    </PhoneFrame>
  )
}
