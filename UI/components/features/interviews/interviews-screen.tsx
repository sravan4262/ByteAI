"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Briefcase, Bell, Bookmark, Share2, ChevronsUpDown, ChevronsDownUp, MessageSquare, Wand2, X, CornerDownLeft, HelpCircle } from 'lucide-react'
import { useNotifications } from '@/components/layout/notification-context'
import { toast } from 'sonner'
import { Avatar } from '@/components/layout/avatar'
import { UserMiniProfile } from '@/components/features/profile/user-mini-profile'
import { getMeCache } from '@/lib/user-cache'

import { SearchableDropdown } from '@/components/ui/searchable-dropdown'
import * as api from '@/lib/api'
import type { InterviewWithQuestions, InterviewQuestion } from '@/lib/api'

const AVATAR_VARIANTS: Array<'cyan' | 'purple' | 'green' | 'orange'> = ['cyan', 'purple', 'green', 'orange']

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'EASY' },
  { value: 'medium', label: 'MEDIUM' },
  { value: 'hard', label: 'HARD' },
]

// ── Smart compose parser ───────────────────────────────────────────────────────

interface ParsedQuery {
  company?: string
  role?: string
  location?: string
  difficulty?: string
}

function parseSmartQuery(raw: string): ParsedQuery {
  const result: ParsedQuery = {}
  const companyParts: string[] = []

  for (const token of raw.trim().split(/\s+/)) {
    if (!token) continue
    const lower = token.toLowerCase()
    if (token.startsWith('@')) {
      const val = token.slice(1)
      if (val) companyParts.push(val)
    } else if (lower.startsWith('role:')) {
      const val = token.slice(5)
      if (val) result.role = val
    } else if (lower.startsWith('loc:')) {
      const val = token.slice(4)
      if (val) result.location = val
    } else if (lower.startsWith('location:')) {
      const val = token.slice(9)
      if (val) result.location = val
    } else if (lower.startsWith('level:')) {
      const val = lower.slice(6)
      if (['easy', 'medium', 'hard'].includes(val)) result.difficulty = val
    } else if (lower.startsWith('#')) {
      const val = lower.slice(1)
      if (['easy', 'medium', 'hard'].includes(val)) result.difficulty = val
    }
  }

  if (companyParts.length > 0) result.company = companyParts.join(' ')
  return result
}

function filtersToSmartQuery(
  company: string | null,
  role: string | null,
  location: string | null,
  difficulty: string | null,
): string {
  const parts: string[] = []
  if (company) parts.push(`@${company}`)
  if (role) parts.push(`role:${role}`)
  if (location) parts.push(`loc:${location}`)
  if (difficulty) parts.push(`#${difficulty}`)
  return parts.join(' ')
}

function difficultyChipClass(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case 'hard':
      return 'text-[var(--red)] border-[rgba(244,63,94,0.35)] bg-[rgba(244,63,94,0.07)]'
    case 'medium':
      return 'text-[var(--orange)] border-[rgba(249,115,22,0.35)] bg-[rgba(249,115,22,0.07)]'
    case 'easy':
      return 'text-[var(--green)] border-[rgba(16,217,160,0.35)] bg-[rgba(16,217,160,0.07)]'
    default:
      return 'text-[var(--t1)] border-[var(--border-h)] bg-[var(--bg-el)]'
  }
}

// ── Question Card ──────────────────────────────────────────────────────────────

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
            ? <ChevronsDownUp size={14} className="text-[var(--purple)]" />
            : <ChevronsUpDown size={14} />}
        </span>
      </button>

      {expanded && (
        <div className="px-4 py-3 border-t border-[var(--border-h)]">
          <p className="text-sm md:text-[15px] text-[var(--t2)] leading-relaxed whitespace-pre-wrap">{q.answer}</p>
        </div>
      )}
    </div>
  )
}

// ── Interview Card ─────────────────────────────────────────────────────────────

function InterviewCard({ interview, avatarVariant }: { interview: InterviewWithQuestions; avatarVariant: typeof AVATAR_VARIANTS[number] }) {
  const router = useRouter()
  const [isBookmarked, setIsBookmarked] = useState(interview.isBookmarked ?? false)
  const [showMiniProfile, setShowMiniProfile] = useState(false)
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
    <article className="border border-[var(--border-h)] rounded-xl bg-[var(--bg-card)] overflow-hidden flex flex-col gap-4">
      {/* Purple identity gradient top line */}
      <div className="h-px bg-gradient-to-r from-[var(--purple)] via-[rgba(167,139,250,0.3)] to-transparent" />

      <div className="px-4 md:px-8 pb-5 md:pb-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start gap-3 md:gap-4">
          {interview.isAnonymous ? (
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[var(--bg-el)] border border-[var(--border-h)] flex items-center justify-center text-lg flex-shrink-0 cursor-default select-none">
              👻
            </div>
          ) : (
            <Avatar
              initials={(interview.authorDisplayName || interview.authorUsername || interview.authorId).slice(0, 1).toUpperCase()}
              imageUrl={interview.authorAvatarUrl}
              size="md"
              variant={avatarVariant}
              onClick={(e) => { e.stopPropagation(); setShowMiniProfile(true) }}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-mono text-sm font-bold text-[var(--t1)] flex items-center gap-2">
              {interview.isAnonymous ? (
                <span className="text-[var(--t2)]">Anonymous</span>
              ) : (
                <>@{interview.authorUsername || interview.authorId.slice(0, 8)}</>
              )}
              {interview.authorId === api.SYSTEM_USER_ID && !interview.isAnonymous && (
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded border border-[var(--accent)] bg-[rgba(99,102,241,0.08)] text-[var(--accent)] tracking-wider leading-none">
                  AI CURATED
                </span>
              )}
            </div>
            <div className="font-mono text-[11px] text-[var(--t2)] mt-0.5 tracking-[0.04em]">
              {interview.isAnonymous ? (
                <span className="font-mono text-[10px] text-[var(--purple)] bg-[rgba(167,139,250,0.08)] border border-[rgba(167,139,250,0.2)] px-2 py-0.5 rounded">
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
          <div className="flex flex-col items-end gap-1">
            <span className="font-mono text-[10px] text-[var(--t2)]">
              {new Date(interview.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Type badge + metadata chips */}
        <div className="flex flex-wrap items-center gap-2 -mt-1">
          <span className="font-mono text-[10px] text-[var(--purple)] bg-[rgba(167,139,250,0.1)] border border-[rgba(167,139,250,0.2)] px-2.5 py-1 rounded flex items-center gap-1.5">
            <Briefcase size={11} /> INTERVIEW
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
            <span className="font-mono text-[10px] text-[var(--t1)] bg-[var(--bg-el)] border border-[var(--border-h)] px-2.5 py-1 rounded">
              📍 {interview.location}
            </span>
          )}
          {interview.difficulty && (
            <span className={`font-mono text-[10px] px-2.5 py-1 rounded border font-bold ${difficultyChipClass(interview.difficulty)}`}>
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
        <h2 className="text-lg md:text-xl lg:text-2xl font-extrabold leading-tight tracking-tight -mt-2">{interview.title}</h2>

        {/* Q&A list */}
        {interview.questions.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-[3px] h-4 rounded-full bg-[var(--purple)] flex-shrink-0" />
                <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.05em]">
                  {interview.questions.length} QUESTION{interview.questions.length !== 1 ? 'S' : ''}
                </span>
              </div>
              <button
                onClick={toggleAll}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[10px] tracking-[0.07em] border transition-all ${
                  allExpanded
                    ? 'text-[var(--purple)] border-[var(--purple)] bg-[rgba(167,139,250,0.15)] shadow-[0_0_12px_rgba(167,139,250,0.2)]'
                    : 'text-[var(--t1)] border-[rgba(167,139,250,0.25)] bg-[rgba(167,139,250,0.03)] hover:border-[rgba(167,139,250,0.5)] hover:bg-[rgba(167,139,250,0.07)] hover:text-[var(--purple)]'
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

        {/* Action strip */}
        <div className="flex items-center gap-2 pt-4 border-t border-[var(--border-h)]">
          <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-xs tracking-[0.07em] text-[var(--t1)] bg-[var(--bg-el)] border border-[var(--border-h)]">
            <Briefcase size={14} />
            <span>{interview.questions.length}Q</span>
          </span>

          <button
            onClick={() => router.push(`/interviews/${interview.id}`)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-xs tracking-[0.07em] text-[var(--t1)] bg-[var(--bg-el)] border border-[var(--border-h)] transition-all hover:text-[var(--purple)] hover:border-[var(--purple)]"
          >
            <MessageSquare size={14} />
            <span>{interview.commentCount ?? 0}</span>
          </button>

          <button
            onClick={handleBookmark}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-xs tracking-[0.07em] transition-all ${
              isBookmarked
                ? 'text-[var(--purple)] bg-[rgba(167,139,250,0.15)] border border-[var(--purple)]'
                : 'text-[var(--t1)] bg-[var(--bg-el)] border border-[var(--border-h)] hover:text-[var(--purple)] hover:border-[var(--purple)]'
            }`}
          >
            <Bookmark size={14} fill={isBookmarked ? 'currentColor' : 'none'} />
            <span>SAVE</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-xs tracking-[0.07em] text-[var(--t1)] bg-[var(--bg-el)] border border-[var(--border-h)] transition-all hover:text-[var(--green)] hover:border-[var(--green)]"
          >
            <Share2 size={14} />
            <span>SHARE</span>
          </button>

          {/* Purple CTA — interview identity color */}
          <button
            onClick={() => router.push(`/interviews/${interview.id}`)}
            className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg font-mono text-[10px] font-bold tracking-[0.1em] text-[var(--purple)] bg-[rgba(167,139,250,0.22)] border border-[rgba(167,139,250,0.6)] shadow-[0_0_10px_rgba(167,139,250,0.18)] transition-all hover:border-[var(--purple)] hover:shadow-[0_0_14px_rgba(167,139,250,0.25)] hover:-translate-y-0.5"
          >
            VIEW_FULL_INTERVIEW
            <span>→</span>
          </button>
        </div>
      </div>
    </article>
  )
}

// ── Smart Compose Bar ──────────────────────────────────────────────────────────

function SmartComposeBar({
  value,
  onChange,
  onCommit,
}: {
  value: string
  onChange: (v: string) => void
  onCommit: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const parsed = parseSmartQuery(value)
  const hasParsed = !!(parsed.company || parsed.role || parsed.location || parsed.difficulty)

  useEffect(() => { inputRef.current?.focus() }, [])

  return (
    <div className="flex flex-col gap-2">
      {/* Input row */}
      <div className="flex items-center gap-2 bg-[rgba(167,139,250,0.05)] border border-[rgba(167,139,250,0.3)] rounded-lg px-3 py-2.5 focus-within:border-[var(--purple)] focus-within:shadow-[0_0_0_3px_rgba(167,139,250,0.14)] transition-all">
        <span className="font-mono text-sm font-bold text-[var(--purple)] flex-shrink-0">{'>'}</span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onCommit() } }}
          placeholder="@stripe role:swe loc:sf #hard"
          className="flex-1 bg-transparent font-mono text-sm text-[var(--t1)] placeholder:text-[var(--t2)] outline-none min-w-0"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
        />
        {value && (
          <button onClick={() => onChange('')} className="text-[var(--t3)] hover:text-[var(--t2)] transition-colors flex-shrink-0">
            <X size={14} />
          </button>
        )}
        <button
          onClick={onCommit}
          disabled={!value.trim()}
          className={`flex-shrink-0 transition-colors ${value.trim() ? 'text-[var(--purple)]' : 'text-[var(--t3)]'}`}
        >
          <CornerDownLeft size={14} />
        </button>
      </div>

      {/* Syntax legend — shown only when input is empty */}
      {!value && (
        <div className="flex flex-col gap-1 pl-1">
          {[
            { token: '@name', meaning: 'company' },
            { token: 'role:value', meaning: 'role' },
            { token: 'loc:value', meaning: 'location' },
            { token: '#easy / #medium / #hard', meaning: 'level' },
          ].map(({ token, meaning }) => (
            <div key={token} className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-semibold text-[rgba(167,139,250,0.85)]">{token}</span>
              <span className="font-mono text-[10px] text-[var(--t3)]">→</span>
              <span className="font-mono text-[10px] text-[var(--t3)]">{meaning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Live preview chips — shown when parsing has results */}
      {hasParsed && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-[10px] text-[var(--purple)]">◆</span>
          {parsed.company && <PreviewChip label="company" value={parsed.company} />}
          {parsed.role && <PreviewChip label="role" value={parsed.role} />}
          {parsed.location && <PreviewChip label="loc" value={parsed.location} />}
          {parsed.difficulty && <PreviewChip label="level" value={parsed.difficulty} />}
        </div>
      )}
    </div>
  )
}

function PreviewChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-center gap-1 font-mono text-[10px] px-2 py-1 rounded border border-[rgba(167,139,250,0.5)] bg-[rgba(167,139,250,0.12)]">
      <span className="text-[rgba(167,139,250,0.85)] font-semibold">{label}=</span>
      <span className="text-[var(--t1)] font-semibold">"{value}"</span>
    </span>
  )
}

// ── Main Screen ────────────────────────────────────────────────────────────────

export function InterviewsScreen() {
  const { openNotifications, unreadCount } = useNotifications()
  const cache = getMeCache()
  const avatarSrc = cache?.avatarUrl ?? null
  const isEmoji = avatarSrc && !avatarSrc.startsWith('http')
  const initials = (cache?.displayName?.[0] ?? cache?.username?.[0] ?? '?').toUpperCase()

  const [companyFilter, setCompanyFilter] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<string | null>(null)
  const [locationFilter, setLocationFilter] = useState<string | null>(null)
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null)

  const [interviews, setInterviews] = useState<InterviewWithQuestions[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [companies, setCompanies] = useState<{ value: string; label: string }[]>([])
  const [roles, setRoles] = useState<{ value: string; label: string }[]>([])
  const [locations, setLocations] = useState<{ value: string; label: string }[]>([])

  const [smartMode, setSmartMode] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('byteai.interviews.smartMode') === 'true'
  })
  const [smartDraft, setSmartDraft] = useState('')

  const activeCount = [companyFilter, roleFilter, locationFilter, difficultyFilter].filter(Boolean).length
  const hasAnyFilter = activeCount > 0

  // Sync smart mode toggle to localStorage
  const toggleSmartMode = () => {
    const next = !smartMode
    setSmartMode(next)
    localStorage.setItem('byteai.interviews.smartMode', String(next))
    if (next) {
      setSmartDraft(filtersToSmartQuery(companyFilter, roleFilter, locationFilter, difficultyFilter))
    }
  }

  // Apply parsed smart query to filter state
  const commitSmartQuery = () => {
    const parsed = parseSmartQuery(smartDraft)
    setCompanyFilter(parsed.company ?? null)
    setRoleFilter(parsed.role ?? null)
    setLocationFilter(parsed.location ?? null)
    setDifficultyFilter(parsed.difficulty ?? null)
  }

  const resetFilters = () => {
    setCompanyFilter(null)
    setRoleFilter(null)
    setLocationFilter(null)
    setDifficultyFilter(null)
    setSmartDraft('')
  }

  useEffect(() => {
    api.getInterviewCompanies().then((data) => setCompanies(data.map((c) => ({ value: c, label: c }))))
    api.getInterviewRoles().then((data) => setRoles(data.map((r) => ({ value: r, label: r }))))
    api.getInterviewLocations().then((data) => setLocations(data.map((l) => ({ value: l, label: l }))))
  }, [])

  const loadInterviews = useCallback(async () => {
    setIsLoading(true)
    const { interviews: data } = await api.getInterviews({
      company: companyFilter ?? undefined,
      role: roleFilter ?? undefined,
      location: locationFilter ?? undefined,
      difficulty: difficultyFilter ?? undefined,
    })
    setInterviews(data)
    setIsLoading(false)
  }, [companyFilter, roleFilter, locationFilter, difficultyFilter])

  useEffect(() => { loadInterviews() }, [loadInterviews])

  return (
    <div className="flex flex-col h-full">
      {/* Header — floating card, purple identity */}
      <header className="flex items-center justify-between px-4 py-3 lg:px-6 lg:py-4 border border-[rgba(167,139,250,0.35)] rounded-xl mx-3 mt-3 flex-shrink-0 bg-[rgba(167,139,250,0.07)] backdrop-blur-md">
        <div>
          <h1 className="font-mono text-sm md:text-base lg:text-lg font-bold tracking-[0.07em] flex items-center gap-2">
            <Briefcase size={16} className="text-[var(--purple)]" /> INTERVIEWS
          </h1>
          <div className="font-mono text-[10px] md:text-xs tracking-[0.08em] text-[var(--t1)] mt-0.5">
            FIND INTERVIEWS ACROSS TOP COMPANIES · ACE YOUR NEXT ROLE
          </div>
        </div>
        {/* Shared chrome — bell + avatar always use --accent (blue) */}
        <div className="flex items-center gap-3">
          <button
            onClick={openNotifications}
            className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[var(--bg-el)] flex items-center justify-center relative transition-all ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-card)] shadow-[0_0_10px_rgba(59,130,246,0.35)] hover:shadow-[0_0_16px_rgba(59,130,246,0.55)]"
          >
            <Bell size={16} className="text-[var(--accent)]" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--accent)] rounded-full border-[1.5px] border-[var(--bg)] shadow-[0_0_5px_var(--accent)]" />
            )}
          </button>
          <Link href="/profile">
            {isEmoji
              ? <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[var(--bg-el)] flex items-center justify-center text-xl ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-card)] transition-all">{avatarSrc}</div>
              : avatarSrc
                ? <img src={avatarSrc} referrerPolicy="no-referrer" alt="profile" className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-card)] hover:ring-[rgba(96,165,250,1)] transition-all" />
                : <Avatar initials={initials} size="sm" />
            }
          </Link>
        </div>
      </header>

      {/* Filter controls */}
      <div className="flex-shrink-0 bg-[var(--bg-o80)] backdrop-blur-sm border-b border-[var(--border-h)] relative z-20 mt-2">
        <div className="flex flex-col gap-2.5 px-4 lg:px-6 py-3">

          {/* Header row: ▌ FILTERS WHERE ●● N active   [smart] [RESET] */}
          <div className="flex items-center gap-2.5">
            <span className="w-[3px] h-3.5 rounded-full bg-[var(--purple)] flex-shrink-0" />
            <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.08em]">FILTERS</span>
            <span className="font-mono text-[10px] font-semibold text-[var(--purple)] tracking-[0.06em]">WHERE</span>

            {hasAnyFilter ? (
              <div className="flex items-center gap-1.5 ml-1">
                {Array.from({ length: Math.min(activeCount, 4) }).map((_, i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--purple)]" />
                ))}
                <span className="font-mono text-[10px] text-[var(--t3)] tracking-[0.04em]">{activeCount} active</span>
              </div>
            ) : (
              <span className="font-mono text-[10px] text-[var(--t3)] tracking-[0.04em] ml-1">── 4 columns</span>
            )}

            <div className="ml-auto flex items-center gap-2">
              {/* Smart mode toggle */}
              <button
                onClick={toggleSmartMode}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-[10px] font-bold tracking-[0.05em] border transition-all ${
                  smartMode
                    ? 'bg-[var(--purple)] text-white border-transparent'
                    : 'bg-[rgba(167,139,250,0.06)] text-[var(--purple)] border-[rgba(167,139,250,0.4)] hover:bg-[rgba(167,139,250,0.12)]'
                }`}
              >
                <Wand2 size={11} />
                SMART
              </button>

              {smartMode && (
                <button
                  onClick={() => window.dispatchEvent(new Event('byteai:open-eastereggs'))}
                  title="Smart-mode syntax cheat sheet"
                  aria-label="Open smart-mode help"
                  className="flex items-center justify-center w-7 h-7 rounded-lg text-[var(--purple)] border border-[rgba(167,139,250,0.4)] bg-[rgba(167,139,250,0.06)] hover:bg-[rgba(167,139,250,0.12)] transition-all"
                >
                  <HelpCircle size={12} />
                </button>
              )}

              {hasAnyFilter && (
                <button
                  onClick={resetFilters}
                  className="font-mono text-[10px] tracking-[0.08em] px-3 py-1.5 rounded-lg border border-[rgba(167,139,250,0.4)] bg-[rgba(167,139,250,0.08)] text-[var(--purple)] hover:bg-[rgba(167,139,250,0.15)] transition-all"
                >
                  RESET
                </button>
              )}
            </div>
          </div>

          {/* Filter inputs row */}
          {smartMode ? (
            <SmartComposeBar
              value={smartDraft}
              onChange={setSmartDraft}
              onCommit={commitSmartQuery}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="w-[3px] h-3.5 rounded-full bg-[var(--purple)]" />
                <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.08em]">COMPANY</span>
                <SearchableDropdown
                  options={companies}
                  value={companyFilter}
                  onChange={setCompanyFilter}
                  placeholder="COMPANY"
                  allLabel="ALL COMPANIES"
                  accentColor="purple"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="w-[3px] h-3.5 rounded-full bg-[var(--purple)]" />
                <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.08em]">ROLE</span>
                <SearchableDropdown
                  options={roles}
                  value={roleFilter}
                  onChange={setRoleFilter}
                  placeholder="ROLE"
                  allLabel="ALL ROLES"
                  accentColor="purple"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="w-[3px] h-3.5 rounded-full bg-[var(--purple)]" />
                <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.08em]">LOCATION</span>
                <SearchableDropdown
                  options={locations}
                  value={locationFilter}
                  onChange={setLocationFilter}
                  placeholder="LOCATION"
                  allLabel="ALL LOCATIONS"
                  accentColor="purple"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="w-[3px] h-3.5 rounded-full bg-[var(--purple)]" />
                <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.08em]">DIFFICULTY</span>
                <SearchableDropdown
                  options={DIFFICULTY_OPTIONS}
                  value={difficultyFilter}
                  onChange={setDifficultyFilter}
                  placeholder="DIFFICULTY"
                  allLabel="ALL LEVELS"
                  accentColor="purple"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">
        <div className="flex flex-col gap-2 p-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <div className="font-mono text-xs text-[var(--t2)] animate-pulse">LOADING INTERVIEWS...</div>
            </div>
          ) : interviews.length === 0 ? (
            <div className="border border-[rgba(167,139,250,0.2)] bg-[rgba(167,139,250,0.03)] rounded-xl px-5 py-10 text-center flex flex-col items-center gap-2 mt-4">
              <Briefcase size={20} className="text-[var(--purple)] opacity-50" />
              <p className="font-mono text-xs font-bold text-[var(--t1)]">NO INTERVIEWS FOUND</p>
              <p className="text-xs text-[var(--t2)]">Try adjusting your filters or post the first one.</p>
              <p className="font-mono text-[10px] text-[var(--t3)] mt-2">
                ◆ Smart Mode: <span className="text-[var(--purple)]">@google role:swe #hard</span>
              </p>
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
    </div>
  )
}
