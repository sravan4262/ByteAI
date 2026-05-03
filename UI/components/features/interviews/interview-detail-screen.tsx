"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Briefcase, ChevronLeft, Bookmark, Share2, ChevronsUpDown, ChevronsDownUp, MessageSquare, Send, Trash2, ChevronDown, ChevronUp, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { PhoneFrame } from '@/components/layout/phone-frame'
import { Avatar } from '@/components/layout/avatar'
import { UserMiniProfile } from '@/components/features/profile/user-mini-profile'
import { OverflowMenu } from '@/components/features/moderation/overflow-menu'
import { renderMentions } from '@/lib/utils/render-mentions'
import { getMeCache } from '@/lib/user-cache'
import * as api from '@/lib/api'
import type { InterviewWithQuestions, InterviewQuestion, InterviewComment, QuestionComment } from '@/lib/api'
import { ApiError, type ModerationReason } from '@/lib/api/http'
import { ErrorModal, resolveErrorModal } from '@/components/ui/error-modal'

type CommentPostError = { errorCode: string; reason?: string; reasons?: ModerationReason[] } | null

// ── Question comment thread ────────────────────────────────────────────────────

function QuestionCommentThread({
  question,
  currentUserId,
}: {
  question: InterviewQuestion
  currentUserId: string | null
}) {
  const [comments, setComments] = useState<QuestionComment[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [body, setBody] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [postError, setPostError] = useState<CommentPostError>(null)

  const load = async () => {
    if (isLoaded) return
    const data = await api.getQuestionComments(question.id)
    setComments(data)
    setIsLoaded(true)
  }

  const handleToggle = () => {
    setIsOpen((v) => !v)
    load()
  }

  const handleAdd = async () => {
    const trimmed = body.trim()
    if (!trimmed || isSubmitting) return
    setIsSubmitting(true)
    try {
      const created = await api.addQuestionComment(question.id, trimmed)
      setComments((prev) => [...prev, created])
      setBody('')
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

  const handleDelete = async (commentId: string) => {
    try {
      await api.deleteQuestionComment(commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch {
      toast.error('Failed to delete comment')
    }
  }

  const count = isLoaded ? comments.length : question.commentCount

  return (
    <div className="border-t border-[var(--border-h)]">
      {/* Toggle */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-[rgba(255,255,255,0.02)] transition-all"
      >
        <MessageSquare size={12} className="text-[var(--accent)] flex-shrink-0" />
        <span className="font-mono text-[10px] tracking-[0.08em] text-[var(--t1)] flex-1">
          COMMENTS {count > 0 ? `(${count})` : ''}
        </span>
        {isOpen
          ? <ChevronUp size={12} className="text-[var(--accent)]" />
          : <ChevronDown size={12} className="text-[var(--accent)]" />}
      </button>

      {isOpen && (
        <div className="px-4 pb-3 flex flex-col gap-3">
          {/* Comment list */}
          {comments.length > 0 ? (
            <div className="flex flex-col gap-2">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2 group">
                  <Avatar
                    initials={(c.authorDisplayName || c.authorUsername || 'U')[0].toUpperCase()}
                    imageUrl={c.authorAvatarUrl}
                    size="xs"
                    variant="purple"
                  />
                  <div className="flex-1 min-w-0 bg-[var(--bg)] border border-[var(--border-h)] rounded-xl px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-mono text-[10px] font-bold text-[var(--t1)]">
                        @{c.authorUsername || 'user'}
                      </span>
                      {c.authorRoleTitle && (
                        <span className="font-mono text-[10px] text-[var(--accent)] truncate max-w-[100px]">{c.authorRoleTitle}</span>
                      )}
                      <span className="font-mono text-[10px] text-[var(--t2)] ml-auto">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                      {(c.authorId === 'me' || (currentUserId && c.authorId === currentUserId)) ? (
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-[var(--t3)] hover:text-[var(--red)] transition-all"
                        >
                          <Trash2 size={10} />
                        </button>
                      ) : (
                        <OverflowMenu
                          contentType="interview_question_comment"
                          contentId={c.id}
                          isOwnContent={false}
                        />
                      )}
                    </div>
                    <p className="text-xs leading-relaxed text-[var(--t2)]">{renderMentions(c.body)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-mono text-[10px] text-[var(--t2)] text-center py-1">No comments yet</p>
          )}

          {/* Inline input */}
          <div className="flex items-center gap-2 bg-[rgba(59,130,246,0.04)] border border-[rgba(59,130,246,0.2)] rounded-full px-3 py-2 focus-within:border-[var(--accent)] focus-within:bg-[rgba(59,130,246,0.07)] transition-all">
            <input
              type="text"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Add a comment..."
              className="flex-1 bg-transparent font-mono text-[10px] text-[var(--t1)] outline-none placeholder:text-[var(--t2)]"
            />
            <button
              onClick={handleAdd}
              disabled={!body.trim() || isSubmitting}
              className="w-6 h-6 rounded-full bg-gradient-to-br from-[var(--accent)] to-[#1d4ed8] flex items-center justify-center text-white transition-all hover:shadow-[0_2px_8px_rgba(59,130,246,0.4)] disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send size={10} />
            </button>
          </div>
        </div>
      )}

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

// ── Question item (with inline comments) ──────────────────────────────────────

function QuestionItem({
  q,
  index,
  expanded,
  onToggle,
  currentUserId,
}: {
  q: InterviewQuestion
  index: number
  expanded: boolean
  onToggle: () => void
  currentUserId: string | null
}) {
  return (
    <div className="border border-[var(--border-h)] rounded-xl overflow-hidden bg-[var(--bg-el)]">
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[rgba(255,255,255,0.02)] transition-all"
      >
        <span className="font-mono text-[10px] text-[var(--accent)] bg-[rgba(59,130,246,0.12)] border border-[rgba(59,130,246,0.2)] rounded px-2 py-1 flex-shrink-0 mt-0.5">
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
        <>
          <div className="px-4 py-3 border-t border-[var(--border-h)]">
            <p className="text-sm md:text-[15px] text-[var(--t2)] leading-relaxed whitespace-pre-wrap">{q.answer}</p>
          </div>
          <QuestionCommentThread question={q} currentUserId={currentUserId} />
        </>
      )}
    </div>
  )
}

// ── Main Detail Screen ─────────────────────────────────────────────────────────

export function InterviewDetailScreen({ interview }: { interview: InterviewWithQuestions }) {
  const router = useRouter()
  const meCache = getMeCache()
  const [showMiniProfile, setShowMiniProfile] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(interview.isBookmarked ?? false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const allExpanded = interview.questions.length > 0 && expandedIds.size === interview.questions.length

  // Interview-level discussion
  const [comments, setComments] = useState<InterviewComment[]>([])
  const [commentBody, setCommentBody] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [commentPostError, setCommentPostError] = useState<CommentPostError>(null)

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
      const created = await api.addInterviewComment(interview.id, trimmed)
      setComments((prev) => [...prev, created])
      setCommentBody('')
      toast.success('Comment posted')
    } catch (err) {
      if (err instanceof ApiError) {
        setCommentPostError({ errorCode: err.errorCode, reason: err.reason, reasons: err.reasons })
      } else {
        toast.error('Failed to post comment')
      }
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
      <header className="flex items-center justify-between px-4 py-3 lg:px-6 lg:py-4 border-b border-[var(--border-h)] flex-shrink-0 bg-[var(--bg-o92)] backdrop-blur-md">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 font-mono text-[10px] text-[var(--t2)] px-[10px] py-[5px] rounded-md border border-[var(--border-h)] bg-[var(--bg-el)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] hover:-translate-x-px"
        >
          <ChevronLeft size={12} /> BACK
        </button>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">
        <div className="px-4 py-4 lg:px-8 lg:py-6 flex flex-col gap-4 lg:gap-5 max-w-4xl mx-auto">

          {/* Content card with accent top line */}
          <div className="rounded-xl border border-[var(--border-h)] bg-[var(--bg-card)] overflow-hidden">
            <div className="h-px bg-gradient-to-r from-[var(--accent)] via-[rgba(59,130,246,0.3)] to-transparent" />
            <div className="p-4 lg:p-5 flex flex-col gap-4">

              {/* Author */}
              <div className="flex items-center gap-3">
                {interview.isAnonymous ? (
                  <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-[var(--bg-el)] border border-[var(--border-h)] flex items-center justify-center text-xl flex-shrink-0 cursor-default select-none">
                    👻
                  </div>
                ) : (
                  <Avatar
                    initials={(interview.authorDisplayName || interview.authorUsername || interview.authorId).slice(0, 1).toUpperCase()}
                    imageUrl={interview.authorAvatarUrl}
                    size="md"
                    variant="purple"
                    onClick={(e) => { e.stopPropagation(); setShowMiniProfile(true) }}
                  />
                )}
                <div>
                  <div className="font-mono text-xs lg:text-sm font-bold text-[var(--t1)]">
                    {interview.isAnonymous ? (
                      <span className="text-[var(--t2)]">Anonymous</span>
                    ) : (
                      <>@{interview.authorUsername || interview.authorId.slice(0, 8)}</>
                    )}
                  </div>
                  <div className="font-mono text-[10px] text-[var(--t2)] mt-[3px] tracking-[0.04em]">
                    {interview.isAnonymous ? (
                      <span className="font-mono text-[10px] text-[var(--accent)] bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.2)] px-2 py-0.5 rounded">
                        👻 anonymous post
                      </span>
                    ) : (
                      <>
                        {interview.authorRole ?? ''}
                        {interview.authorRole && interview.authorCompany ? ' @ ' : ''}
                        {interview.authorCompany ?? ''}
                      </>
                    )}
                  </div>
                </div>
                <span className="ml-auto font-mono text-[10px] text-[var(--t2)]">
                  {new Date(interview.createdAt).toLocaleDateString()}
                </span>
                {!interview.isAnonymous && (
                  <OverflowMenu
                    contentType="interview"
                    contentId={interview.id}
                    isOwnContent={!!currentUserId && currentUserId === interview.authorId}
                    authorUserId={interview.authorId}
                    authorUsername={interview.authorUsername ?? undefined}
                    showBlock
                    onBlocked={() => router.push('/interviews')}
                  />
                )}
              </div>

              {/* Type badge + metadata chips */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] text-[var(--accent)] bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)] px-2.5 py-1 rounded flex items-center gap-1.5">
                  <Briefcase size={10} /> INTERVIEW
                </span>
                {interview.company && (
                  <span className="font-mono text-[10px] text-[var(--t1)] bg-[var(--bg-el)] border border-[var(--border-h)] px-2.5 py-1 rounded">
                    {interview.company}
                  </span>
                )}
                {interview.role && (
                  <span className="font-mono text-[10px] text-[var(--t1)] bg-[var(--bg-el)] border border-[var(--border-h)] px-2.5 py-1 rounded">
                    {interview.role}
                  </span>
                )}
                {interview.location && (
                  <span className="font-mono text-[10px] text-[var(--t1)] bg-[var(--bg-el)] border border-[var(--border-h)] px-2.5 py-1 rounded flex items-center gap-1">
                    <MapPin size={10} /> {interview.location}
                  </span>
                )}
                {interview.difficulty && (
                  <span className={`font-mono text-[10px] px-2.5 py-1 rounded border font-bold ${
                    interview.difficulty.toLowerCase() === 'hard'
                      ? 'text-[var(--red)] border-[rgba(244,63,94,0.35)] bg-[rgba(244,63,94,0.07)]'
                      : interview.difficulty.toLowerCase() === 'medium'
                      ? 'text-[var(--orange)] border-[rgba(249,115,22,0.35)] bg-[rgba(249,115,22,0.07)]'
                      : 'text-[var(--green)] border-[rgba(16,217,160,0.35)] bg-[rgba(16,217,160,0.07)]'
                  }`}>
                    {interview.difficulty.toUpperCase()}
                  </span>
                )}
              </div>

              {showMiniProfile && !interview.isAnonymous && (
                <UserMiniProfile
                  userId={interview.authorId}
                  username={interview.authorUsername ?? ''}
                  displayName={interview.authorDisplayName ?? interview.authorUsername ?? ''}
                  initials={(interview.authorDisplayName || interview.authorUsername || 'U')[0].toUpperCase()}
                  avatarUrl={interview.authorAvatarUrl}
                  role={interview.authorRole}
                  company={interview.authorCompany}
                  onClose={() => setShowMiniProfile(false)}
                />
              )}

              {/* Title */}
              <h1 className="text-xl lg:text-2xl xl:text-3xl font-extrabold leading-tight tracking-tight -mt-2">
                {interview.title}
              </h1>

            </div>
          </div>

          {/* Questions — each has inline comment thread when expanded */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-[3px] h-4 rounded-full bg-[var(--accent)] flex-shrink-0" />
                <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.05em]">
                  {interview.questions.length} QUESTION{interview.questions.length !== 1 ? 'S' : ''}
                </span>
              </div>
              <button
                onClick={toggleAll}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[10px] tracking-[0.07em] border transition-all ${
                  allExpanded
                    ? 'text-[var(--accent)] border-[var(--accent)] bg-[var(--accent-d)] shadow-[0_0_12px_rgba(59,130,246,0.2)]'
                    : 'text-[var(--t1)] border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)]'
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
                currentUserId={currentUserId}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-h)]">
            <button
              onClick={handleBookmark}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-xs tracking-[0.07em] transition-all ${
                isBookmarked
                  ? 'text-[var(--accent)] bg-[var(--accent-d)] border border-[var(--accent)]'
                  : 'text-[var(--t2)] bg-[var(--bg-el)] border border-[var(--border-h)] hover:text-[var(--accent)] hover:border-[var(--accent)]'
              }`}
            >
              <Bookmark size={14} fill={isBookmarked ? 'currentColor' : 'none'} />
              {isBookmarked ? 'SAVED' : 'SAVE'}
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-xs tracking-[0.07em] text-[var(--t2)] bg-[var(--bg-el)] border border-[var(--border-h)] transition-all hover:text-[var(--green)] hover:border-[var(--green)]"
            >
              <Share2 size={14} /> SHARE
            </button>
          </div>

          {/* Interview-level Discussion */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-[3px] h-4 rounded-full bg-[var(--accent)] flex-shrink-0" />
                <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.05em] flex items-center gap-1.5">
                  <MessageSquare size={13} className="text-[var(--accent)]" /> DISCUSSION
                </span>
                <span className="bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.3)] rounded-full px-[7px] py-px text-[10px] text-[var(--accent)] font-bold font-mono">
                  {comments.length}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {comments.length > 0 ? (
                comments.map((c) => (
                  <div key={c.id} className="flex gap-[10px] lg:gap-4 group">
                    <Avatar
                      initials={(c.authorDisplayName || c.authorUsername || 'U')[0].toUpperCase()}
                      imageUrl={c.authorAvatarUrl}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0 bg-[var(--bg-card)] border border-[var(--border-h)] rounded-xl px-3 py-[10px] lg:px-4 lg:py-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="font-mono text-[10px] lg:text-xs font-bold text-[var(--t1)]">
                          @{c.authorUsername || 'user'}
                        </span>
                        {c.authorRoleTitle && (
                          <span className="font-mono text-[10px] text-[var(--accent)] truncate max-w-[120px]">{c.authorRoleTitle}</span>
                        )}
                        <span className="font-mono text-[10px] text-[var(--t2)] ml-auto">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                        {(c.authorId === 'me' || (currentUserId && c.authorId === currentUserId)) ? (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--t3)] hover:text-[var(--red)] hover:bg-[rgba(244,63,94,0.08)] transition-all"
                          >
                            <Trash2 size={11} />
                          </button>
                        ) : (
                          <OverflowMenu
                            contentType="interview_comment"
                            contentId={c.id}
                            isOwnContent={false}
                          />
                        )}
                      </div>
                      <p className="text-xs lg:text-sm leading-relaxed text-[var(--t2)]">{renderMentions(c.body)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] rounded-xl px-5 py-8 text-center flex flex-col items-center gap-2">
                  <MessageSquare size={20} className="text-[var(--accent)] opacity-50" />
                  <p className="font-mono text-xs font-bold text-[var(--t1)]">NO DISCUSSION YET</p>
                  <p className="text-xs text-[var(--t2)]">Be the first to add insight.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Discussion input — pinned to bottom, pill pattern */}
      <div className="flex items-center gap-2 px-4 py-3 lg:px-6 border-t border-[var(--border-h)] bg-[var(--bg-o95)] flex-shrink-0">
        <Avatar
          initials={(meCache?.displayName || meCache?.username || 'U')[0].toUpperCase()}
          imageUrl={meCache?.avatarUrl ?? undefined}
          size="xs"
        />
        <div className="flex-1 flex items-center bg-[rgba(59,130,246,0.04)] border border-[rgba(59,130,246,0.2)] rounded-full px-4 py-2.5 focus-within:border-[var(--accent)] focus-within:bg-[rgba(59,130,246,0.07)] transition-all">
          <input
            type="text"
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
            placeholder="Add to discussion..."
            className="flex-1 bg-transparent font-mono text-[10px] lg:text-sm text-[var(--t1)] outline-none placeholder:text-[var(--t2)]"
          />
        </div>
        <button
          onClick={handleAddComment}
          disabled={!commentBody.trim() || isSubmitting}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--accent)] to-[#1d4ed8] shadow-[0_4px_16px_rgba(59,130,246,0.3)] hover:shadow-[0_6px_24px_rgba(59,130,246,0.4)] flex items-center justify-center text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          <Send size={14} />
        </button>
      </div>

      {commentPostError && (
        <ErrorModal
          {...resolveErrorModal(commentPostError.errorCode, commentPostError.reason)}
          reasons={commentPostError.reasons}
          onClose={() => setCommentPostError(null)}
        />
      )}
    </PhoneFrame>
  )
}
