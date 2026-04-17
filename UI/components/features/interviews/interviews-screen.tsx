"use client"

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Briefcase, Bell, Bookmark, Share2, Plus, ChevronsUpDown, ChevronsDownUp, MessageSquare } from 'lucide-react'
import { useNotifications } from '@/components/layout/notification-context'
import { toast } from 'sonner'
import { Avatar } from '@/components/layout/avatar'
import { UserMiniProfile } from '@/components/features/profile/user-mini-profile'
import { getMeCache } from '@/lib/user-cache'

import { SearchableDropdown } from '@/components/ui/searchable-dropdown'
import * as api from '@/lib/api'
import type { InterviewWithQuestions, InterviewQuestion } from '@/lib/api'

const AVATAR_VARIANTS: Array<'cyan' | 'purple' | 'green' | 'orange'> = ['cyan', 'purple', 'green', 'orange']

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
        <span className="font-mono text-[10px] text-[var(--purple)] bg-[rgba(167,139,250,0.12)] border border-[rgba(167,139,250,0.2)] rounded px-2 py-1 flex-shrink-0 mt-0.5">
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
  const [isBookmarked, setIsBookmarked] = useState(interview.isBookmarked ?? false)
  const [showMiniProfile, setShowMiniProfile] = useState(false)
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
        {interview.isAnonymous ? (
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[var(--bg-el)] border border-[var(--border-m)] flex items-center justify-center text-lg flex-shrink-0 cursor-default select-none">
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
          <div className="font-mono text-sm md:text-sm font-bold text-[var(--t1)] flex items-center gap-2">
            {interview.isAnonymous ? (
              <span className="text-[var(--t2)]">Anonymous</span>
            ) : (
              <>@{interview.authorUsername || interview.authorId.slice(0, 8)}</>
            )}
          </div>
          <div className="font-mono text-xs md:text-xs text-[var(--t2)] mt-0.5 tracking-[0.04em]">
            {interview.isAnonymous ? (
              <span className="font-mono text-[9px] text-[var(--purple)] bg-[rgba(167,139,250,0.08)] border border-[rgba(167,139,250,0.2)] px-2 py-0.5 rounded">
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
          <span className="font-mono text-[10px] md:text-xs text-[var(--t3)]">
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
          <span className="font-mono text-[10px] text-[var(--t1)] bg-[var(--bg-el)] border border-[var(--border-m)] px-2.5 py-1 rounded">
            {interview.company}
          </span>
        )}
        {interview.role && (
          <span className="font-mono text-[10px] text-[var(--t1)] bg-[var(--bg-el)] border border-[var(--border-m)] px-2.5 py-1 rounded">
            {interview.role}
          </span>
        )}
        {interview.location && (
          <span className="font-mono text-[10px] text-[var(--t1)] bg-[var(--bg-el)] border border-[var(--border-m)] px-2.5 py-1 rounded">
            📍 {interview.location}
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

      {/* Title — matches PostCard h2 */}
      <h2 className="text-lg md:text-xl lg:text-2xl font-extrabold leading-tight tracking-tight -mt-2">{interview.title}</h2>

      {/* Q&A list */}
      {interview.questions.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[10px] tracking-[0.1em] text-[var(--t2)]">
              // {interview.questions.length} QUESTION{interview.questions.length !== 1 ? 'S' : ''}
            </div>
            <button
              onClick={toggleAll}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-mono text-[10px] tracking-[0.07em] border transition-all ${
                allExpanded
                  ? 'text-[var(--accent)] border-[var(--accent)] bg-[var(--accent-d)]'
                  : 'text-[var(--purple)] border-[rgba(167,139,250,0.4)] bg-[rgba(167,139,250,0.06)] hover:bg-[rgba(167,139,250,0.12)] hover:border-[rgba(167,139,250,0.7)]'
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
        <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-xs tracking-[0.07em] text-[var(--t1)] bg-[var(--bg-el)] border border-[var(--border-m)]">
          <Briefcase size={14} />
          <span>{interview.questions.length}Q</span>
        </span>

        {/* Comment count — navigates to detail screen discussion section */}
        <button
          onClick={() => router.push(`/interviews/${interview.id}`)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-xs tracking-[0.07em] text-[var(--t1)] bg-[var(--bg-el)] border border-[var(--border-m)] transition-all hover:text-[var(--purple)] hover:border-[rgba(167,139,250,0.5)]"
        >
          <MessageSquare size={14} />
          <span>{interview.commentCount ?? 0}</span>
        </button>

        {/* Bookmark */}
        <button
          onClick={handleBookmark}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-xs tracking-[0.07em] transition-all ${
            isBookmarked
              ? 'text-[var(--accent)] bg-[var(--accent-d)] border border-[var(--accent)]'
              : 'text-[var(--t1)] bg-[var(--bg-el)] border border-[var(--border-m)] hover:text-[var(--accent)] hover:border-[var(--accent)]'
          }`}
        >
          <Bookmark size={14} fill={isBookmarked ? 'currentColor' : 'none'} />
          <span>SAVE</span>
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-xs tracking-[0.07em] text-[var(--t1)] bg-[var(--bg-el)] border border-[var(--border-m)] transition-all hover:text-[var(--green)] hover:border-[var(--green)]"
        >
          <Share2 size={14} />
          <span>SHARE</span>
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
  const { openNotifications, unreadCount } = useNotifications()
  const cache = getMeCache()
  const avatarSrc = cache?.avatarUrl ?? null
  const isEmoji = avatarSrc && !avatarSrc.startsWith('http')
  const initials = (cache?.displayName?.[0] ?? cache?.username?.[0] ?? '?').toUpperCase()
  const [companyFilter, setCompanyFilter] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<string | null>(null)
  const [locationFilter, setLocationFilter] = useState<string | null>(null)
  const [interviews, setInterviews] = useState<InterviewWithQuestions[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [companies, setCompanies] = useState<{ value: string; label: string }[]>([])
  const [roles, setRoles] = useState<{ value: string; label: string }[]>([])
  const [locations, setLocations] = useState<{ value: string; label: string }[]>([])

  useEffect(() => {
    api.getInterviewCompanies().then((data) =>
      setCompanies(data.map((c) => ({ value: c, label: c })))
    )
    api.getInterviewRoles().then((data) =>
      setRoles(data.map((r) => ({ value: r, label: r })))
    )
    api.getInterviewLocations().then((data) =>
      setLocations(data.map((l) => ({ value: l, label: l })))
    )
  }, [])

  const loadInterviews = useCallback(async () => {
    setIsLoading(true)
    const { interviews: data } = await api.getInterviews({
      company: companyFilter ?? undefined,
      role: roleFilter ?? undefined,
      location: locationFilter ?? undefined,
    })
    setInterviews(data)
    setIsLoading(false)
  }, [companyFilter, roleFilter, locationFilter])

  useEffect(() => { loadInterviews() }, [loadInterviews])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 lg:px-6 lg:py-4 border-b border-[var(--border)] flex-shrink-0 bg-[var(--bg-o95)] backdrop-blur-md">
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
            {unreadCount > 0 && (
              <span className="absolute top-[3px] right-[3px] w-[7px] h-[7px] bg-[var(--accent)] rounded-full border-[1.5px] border-[var(--bg)]" />
            )}
          </button>
          <Link href="/profile">
            {isEmoji
              ? <div className="w-8 h-8 rounded-full bg-[var(--bg-el)] border border-[var(--border-h)] flex items-center justify-center text-lg">{avatarSrc}</div>
              : avatarSrc
                ? <img src={avatarSrc} referrerPolicy="no-referrer" alt="profile" className="w-8 h-8 rounded-full object-cover ring-1 ring-[var(--border-h)] hover:ring-[var(--accent)] transition-all" />
                : <Avatar initials={initials} size="xs" />
            }
          </Link>
        </div>
      </header>

      {/* Filter controls */}
      <div className="flex-shrink-0 bg-[var(--bg-o80)] backdrop-blur-sm border-b border-[var(--border)] relative z-20">
        <div className="flex flex-wrap items-center gap-3 px-4 lg:px-6 py-3">
          {/* Company filter */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] tracking-[0.12em] text-[var(--t2)]">COMPANY</span>
            <SearchableDropdown
              options={companies}
              value={companyFilter}
              onChange={setCompanyFilter}
              placeholder="COMPANY"
              allLabel="ALL COMPANIES"
              accentColor="purple"
            />
          </div>

          {/* Role filter */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] tracking-[0.12em] text-[var(--t2)]">ROLE</span>
            <SearchableDropdown
              options={roles}
              value={roleFilter}
              onChange={setRoleFilter}
              placeholder="ROLE"
              allLabel="ALL ROLES"
              accentColor="green"
            />
          </div>

          {/* Location filter */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] tracking-[0.12em] text-[var(--t2)]">LOCATION</span>
            <SearchableDropdown
              options={locations}
              value={locationFilter}
              onChange={setLocationFilter}
              placeholder="LOCATION"
              allLabel="ALL LOCATIONS"
              accentColor="cyan"
            />
          </div>


          <div className="flex-1" />

          {/* Reset */}
          {(companyFilter || roleFilter || locationFilter) && (
            <button
              onClick={() => { setCompanyFilter(null); setRoleFilter(null); setLocationFilter(null) }}
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
