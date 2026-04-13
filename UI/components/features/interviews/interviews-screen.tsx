"use client"

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Briefcase, Bell, Bookmark, Share2, Plus, ChevronsUpDown, ChevronsDownUp, MessageSquare } from 'lucide-react'
import { useNotifications } from '@/components/layout/notification-context'
import { toast } from 'sonner'
import { Avatar } from '@/components/layout/avatar'
import { SearchableDropdown } from '@/components/ui/searchable-dropdown'
import { MultiSelectDropdown } from '@/components/ui/multi-select-dropdown'
import * as api from '@/lib/api'
import type { InterviewWithQuestions, InterviewQuestion } from '@/lib/api'

const COMPANIES = ['Google', 'Meta', 'Amazon', 'Apple', 'Microsoft', 'Netflix', 'Stripe', 'Shopify', 'Airbnb', 'Uber']
  .map((c) => ({ value: c, label: c }))

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
]

const AVATAR_VARIANTS: Array<'cyan' | 'purple' | 'green' | 'orange'> = ['cyan', 'purple', 'green', 'orange']

function difficultyColor(d: string) {
  if (d === 'easy') return 'text-[var(--green)] border-[rgba(16,217,160,0.3)] bg-[rgba(16,217,160,0.06)]'
  if (d === 'hard') return 'text-[var(--red)] border-[rgba(244,63,94,0.3)] bg-[rgba(244,63,94,0.06)]'
  return 'text-[var(--orange)] border-[rgba(251,146,60,0.3)] bg-[rgba(251,146,60,0.06)]'
}

// ── Question Card (fully controlled) ──────────────────────────────────────────

function QuestionCard({
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
      {/* Question header */}
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

      {/* Answer */}
      {expanded && (
        <div className="px-4 py-3 border-t border-[var(--border)]">
          <p className="text-sm md:text-[15px] text-[var(--t2)] leading-relaxed whitespace-pre-wrap">{q.answer}</p>
        </div>
      )}
    </div>
  )
}

// ── Interview Card ─────────────────────────────────────────────────────────────

function InterviewCard({ interview, avatarVariant }: { interview: InterviewWithQuestions; avatarVariant: typeof AVATAR_VARIANTS[number] }) {
  const router = useRouter()
  const [isBookmarked, setIsBookmarked] = useState(false)
  // Controlled expansion: set of expanded question IDs
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const allExpanded = interview.questions.length > 0 && expandedIds.size === interview.questions.length

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
      await navigator.clipboard.writeText(`${window.location.origin}/interviews/${interview.id}`)
      toast.success('Link copied')
    }
  }

  return (
    <article className="px-4 md:px-8 py-5 md:py-6 flex flex-col gap-4 border-b border-[var(--border)] relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(167,139,250,0.08)] to-transparent" />

      {/* Header — matches PostCard exactly */}
      <div className="flex items-start gap-3 md:gap-4">
        <Avatar
          initials={interview.authorId.slice(0, 1).toUpperCase()}
          size="md"
          variant={avatarVariant}
        />
        <div className="flex-1 min-w-0">
          <div className="font-mono text-xs md:text-sm font-bold text-[var(--t1)] flex items-center gap-2">
            @{interview.authorId.slice(0, 8)}
          </div>
          <div className="font-mono text-xs md:text-[13px] text-[var(--t2)] mt-0.5 tracking-[0.04em]">
            {interview.role ?? ''}
            {interview.role && interview.company ? ' @ ' : ''}
            {interview.company ?? ''}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="font-mono text-[10px] md:text-xs text-[var(--t3)]">
            {new Date(interview.createdAt).toLocaleDateString()}
          </span>
          <span className={`font-mono text-[9px] px-2 py-0.5 rounded border ${difficultyColor(interview.difficulty)}`}>
            {interview.difficulty.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Type badge */}
      <span className="font-mono text-[9px] text-[var(--purple)] bg-[rgba(167,139,250,0.1)] border border-[rgba(167,139,250,0.2)] px-2.5 py-1 rounded flex items-center gap-1.5 w-fit">
        <Briefcase size={10} /> INTERVIEW
      </span>

      {/* Title — matches PostCard h2 */}
      <h2 className="text-lg md:text-xl lg:text-2xl font-extrabold leading-tight tracking-tight -mt-2">{interview.title}</h2>

      {/* Q&A list */}
      {interview.questions.length > 0 && (
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
            <QuestionCard
              key={q.id}
              q={q}
              index={i}
              expanded={expandedIds.has(q.id)}
              onToggle={() => toggleQuestion(q.id)}
            />
          ))}
        </div>
      )}

      {/* Actions — mirrors PostCard button strip */}
      <div className="flex items-center gap-2 pt-4 border-t border-[var(--border)]">
        {/* Questions count */}
        <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-[11px] md:text-xs tracking-[0.07em] text-[var(--t2)] bg-[var(--bg-el)] border border-[var(--border-m)]">
          <Briefcase size={14} />
          <span className="hidden sm:inline">{interview.questions.length}Q</span>
        </span>

        {/* Comment count — navigates to detail screen discussion section */}
        <button
          onClick={() => router.push(`/interviews/${interview.id}`)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-[11px] md:text-xs tracking-[0.07em] text-[var(--t2)] bg-[var(--bg-el)] border border-[var(--border-m)] transition-all hover:text-[var(--purple)] hover:border-[rgba(167,139,250,0.5)]"
        >
          <MessageSquare size={14} />
          <span>{interview.commentCount ?? 0}</span>
        </button>

        {/* Bookmark */}
        <button
          onClick={handleBookmark}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-[11px] md:text-xs tracking-[0.07em] transition-all ${
            isBookmarked
              ? 'text-[var(--accent)] bg-[var(--accent-d)] border border-[var(--accent)]'
              : 'text-[var(--t2)] bg-[var(--bg-el)] border border-[var(--border-m)] hover:text-[var(--accent)] hover:border-[var(--accent)]'
          }`}
        >
          <Bookmark size={14} fill={isBookmarked ? 'currentColor' : 'none'} />
          <span className="hidden sm:inline">SAVE</span>
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-[11px] md:text-xs tracking-[0.07em] text-[var(--t2)] bg-[var(--bg-el)] border border-[var(--border-m)] transition-all hover:text-[var(--green)] hover:border-[var(--green)]"
        >
          <Share2 size={14} />
          <span className="hidden sm:inline">SHARE</span>
        </button>

        {/* View full */}
        <button
          onClick={() => router.push(`/interviews/${interview.id}`)}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-[9px] md:text-[10px] tracking-[0.1em] text-white bg-gradient-to-br from-[var(--purple)] to-[#5b21b6] border border-[rgba(167,139,250,0.5)] transition-all hover:shadow-[0_4px_12px_rgba(167,139,250,0.3)] hover:-translate-y-0.5"
        >
          VIEW_FULL_INTERVIEW
          <span>→</span>
        </button>
      </div>
    </article>
  )
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export function InterviewsScreen() {
  const { openNotifications } = useNotifications()
  const [companyFilter, setCompanyFilter] = useState<string | null>(null)
  const [techFilters, setTechFilters] = useState<string[]>([])
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null)
  const [interviews, setInterviews] = useState<InterviewWithQuestions[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadInterviews = useCallback(async () => {
    setIsLoading(true)
    const { interviews: data } = await api.getInterviews({
      company: companyFilter ?? undefined,
      stack: techFilters.length > 0 ? techFilters.join(',') : undefined,
      difficulty: difficultyFilter ?? undefined,
    })
    setInterviews(data)
    setIsLoading(false)
  }, [companyFilter, techFilters, difficultyFilter])

  useEffect(() => { loadInterviews() }, [loadInterviews])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 lg:px-6 lg:py-4 border-b border-[var(--border)] flex-shrink-0 bg-[rgba(5,5,14,0.95)] backdrop-blur-md">
        <div>
          <h1 className="font-mono text-xs lg:text-sm font-bold tracking-[0.07em] flex items-center gap-2">
            <Briefcase size={14} className="text-[var(--purple)]" /> INTERVIEWS
          </h1>
          <div className="font-mono text-[7px] lg:text-[9px] tracking-[0.1em] text-[var(--t2)] mt-0.5">
            FIND INTERVIEWS ACROSS TOP COMPANIES · ACE YOUR NEXT ROLE
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openNotifications}
            className="w-[30px] h-[30px] lg:w-9 lg:h-9 rounded-full bg-[var(--bg-el)] border border-[var(--border-m)] flex items-center justify-center relative transition-all hover:border-[var(--accent)]"
          >
            <Bell size={14} className="text-[var(--t2)]" />
            <span className="absolute top-[3px] right-[3px] w-[7px] h-[7px] bg-[var(--accent)] rounded-full border-[1.5px] border-[var(--bg)]" />
          </button>
          <Link href="/profile">
            <Avatar initials="AX" size="xs" />
          </Link>
        </div>
      </header>

      {/* Filter controls */}
      <div className="flex-shrink-0 bg-[rgba(5,5,14,0.8)] backdrop-blur-sm border-b border-[var(--border)] relative z-20">
        <div className="flex flex-wrap items-center gap-3 px-4 lg:px-6 py-3">
          {/* Company filter */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[8px] tracking-[0.12em] text-[var(--t3)]">COMPANY</span>
            <SearchableDropdown
              options={COMPANIES}
              value={companyFilter}
              onChange={setCompanyFilter}
              placeholder="COMPANY"
              allLabel="ALL COMPANIES"
              accentColor="purple"
            />
          </div>

          {/* Tech filter — multi-select */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[8px] tracking-[0.12em] text-[var(--t3)]">TECH</span>
            <MultiSelectDropdown
              options={[
                { value: 'react', label: 'React' },
                { value: 'typescript', label: 'TypeScript' },
                { value: 'golang', label: 'Go' },
                { value: 'python', label: 'Python' },
                { value: 'dotnet', label: '.NET / C#' },
                { value: 'rust', label: 'Rust' },
                { value: 'kubernetes', label: 'Kubernetes' },
                { value: 'aws', label: 'AWS' },
                { value: 'postgres', label: 'PostgreSQL' },
                { value: 'docker', label: 'Docker' },
              ]}
              values={techFilters}
              onChange={setTechFilters}
              placeholder="TECHNOLOGY"
              accentColor="cyan"
            />
          </div>

          {/* Difficulty */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[8px] tracking-[0.12em] text-[var(--t3)]">LEVEL</span>
            <SearchableDropdown
              options={DIFFICULTY_OPTIONS}
              value={difficultyFilter}
              onChange={setDifficultyFilter}
              placeholder="DIFFICULTY"
              allLabel="ALL LEVELS"
              accentColor="green"
            />
          </div>

          <div className="flex-1" />

          {/* Reset */}
          {(companyFilter || techFilters.length > 0 || difficultyFilter) && (
            <button
              onClick={() => { setCompanyFilter(null); setTechFilters([]); setDifficultyFilter(null) }}
              className="font-mono text-[8px] lg:text-[9px] tracking-[0.08em] px-3 py-2 rounded-full border border-[var(--border-m)] text-[var(--t2)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              RESET
            </button>
          )}
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">
        <div className="max-w-4xl mx-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <div className="font-mono text-xs text-[var(--t2)] animate-pulse">LOADING INTERVIEWS...</div>
            </div>
          ) : interviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
              <div className="font-mono text-base text-[var(--t1)] mb-2">NO INTERVIEWS FOUND</div>
              <div className="font-mono text-xs text-[var(--t2)]">Try adjusting your filters or post the first one.</div>
            </div>
          ) : (
            interviews.map((interview, i) => (
              <InterviewCard
                key={interview.id}
                interview={interview}
                avatarVariant={AVATAR_VARIANTS[i % AVATAR_VARIANTS.length]}
              />
            ))
          )}
        </div>
      </div>

      {/* FAB */}
      <Link
        href="/compose?type=interview"
        className="fixed bottom-6 right-6 lg:right-12 z-10 w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-[var(--purple)] to-[#5b21b6] flex items-center justify-center text-white shadow-[0_4px_20px_rgba(167,139,250,0.4)] transition-all hover:scale-110 hover:shadow-[0_8px_36px_rgba(167,139,250,0.5)]"
      >
        <Plus size={22} />
      </Link>
    </div>
  )
}
