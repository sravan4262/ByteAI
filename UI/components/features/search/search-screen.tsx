"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Bot, X, Layers, Users } from 'lucide-react'
import { PhoneFrame } from '@/components/layout/phone-frame'
import { Avatar } from '@/components/layout/avatar'
import { UserMiniProfile } from '@/components/features/profile/user-mini-profile'
import { useFeatureFlag } from '@/hooks/use-feature-flags'
import * as api from '@/lib/api'
import type { Post, PersonResult, SearchAskSource, SimilarByteResponse } from '@/lib/api'

// ─── Types ───────────────────────────────────────────────────────────────────

type SearchMode = 'bytes' | 'people' | 'ask'
type ModeSource = 'intent' | 'manual'

// ─── Intent detection ────────────────────────────────────────────────────────

const QUESTION_STARTERS = [
  'how ', 'what ', 'why ', 'when ', 'explain ', 'is ', 'are ',
  'does ', 'can ', 'should ', 'will ', 'where ', 'which ',
]

function detectIntent(query: string, hasAiFlag: boolean): SearchMode {
  const q = query.trim().toLowerCase()
  if (q.startsWith('@')) return 'people'
  if (hasAiFlag && (q.startsWith('?') || QUESTION_STARTERS.some((w) => q.startsWith(w)))) return 'ask'
  return 'bytes'
}

// ─── Inline markdown renderer ────────────────────────────────────────────────

function parseInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4)
      return <strong key={i} className="font-semibold text-[var(--accent)]">{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2)
      return (
        <code key={i} className="font-mono text-[10px] bg-[rgba(59,130,246,0.12)] text-[var(--accent)] px-1.5 py-0.5 rounded">
          {part.slice(1, -1)}
        </code>
      )
    return part
  })
}

function renderAnswer(text: string): React.ReactNode {
  if (!text) return null
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let inList = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed) { inList = false; continue }

    const bulletMatch = trimmed.match(/^[-•*]\s(.+)/)
    const numMatch = trimmed.match(/^(\d+)[.)]\s(.+)/)

    if (bulletMatch) {
      inList = true
      nodes.push(
        <div key={i} className="flex gap-2.5 items-start">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] mt-[5px] flex-shrink-0" />
          <span className="text-xs leading-[1.75] text-[var(--t1)]">{parseInline(bulletMatch[1])}</span>
        </div>
      )
    } else if (numMatch) {
      inList = true
      nodes.push(
        <div key={i} className="flex gap-2.5 items-start">
          <span className="font-mono text-[10px] font-bold text-[var(--accent)] mt-0.5 flex-shrink-0 w-4 text-right">{numMatch[1]}.</span>
          <span className="text-xs leading-[1.75] text-[var(--t1)]">{parseInline(numMatch[2])}</span>
        </div>
      )
    } else {
      if (inList) inList = false
      nodes.push(
        <p key={i} className="text-xs leading-[1.75] text-[var(--t1)]">{parseInline(trimmed)}</p>
      )
    }
  }
  return nodes
}

// ─── Mode visual config ───────────────────────────────────────────────────────

const MODE_META: Record<SearchMode, {
  Icon: React.FC<{ size: number; className?: string }>
  label: string
  placeholder: string
  focusBorder: string
  focusShadow: string
  iconClass: string
  badgeClass: string
  chipActiveClass: string
  chipIdleClass: string
  pulse: boolean
}> = {
  bytes: {
    Icon: Search,
    label: 'BYTES',
    placeholder: 'Find bytes by keyword or concept…',
    focusBorder: 'border-[var(--accent)]',
    focusShadow: 'shadow-[0_0_0_3px_rgba(59,130,246,0.14)]',
    iconClass: 'text-[var(--accent)]',
    badgeClass: 'border-[var(--accent)] bg-[var(--accent-d)] text-[var(--accent)]',
    chipActiveClass: 'border-[var(--accent)] bg-[var(--accent-d)] text-[var(--accent)] shadow-[0_0_10px_rgba(59,130,246,0.2)]',
    chipIdleClass: 'border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:text-[var(--accent)]',
    pulse: false,
  },
  people: {
    Icon: Users,
    label: 'PEOPLE',
    placeholder: 'Search for people by name or username…',
    focusBorder: 'border-[var(--accent)]',
    focusShadow: 'shadow-[0_0_0_3px_rgba(59,130,246,0.14)]',
    iconClass: 'text-[var(--accent)]',
    badgeClass: 'border-[var(--accent)] bg-[var(--accent-d)] text-[var(--accent)]',
    chipActiveClass: 'border-[var(--accent)] bg-[var(--accent-d)] text-[var(--accent)] shadow-[0_0_10px_rgba(59,130,246,0.2)]',
    chipIdleClass: 'border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:text-[var(--accent)]',
    pulse: false,
  },
  ask: {
    Icon: Bot,
    label: 'ASK AI',
    placeholder: 'Ask about any topic — AI answers from bytes…',
    focusBorder: 'border-[var(--accent)]',
    focusShadow: 'shadow-[0_0_0_3px_rgba(59,130,246,0.22)]',
    iconClass: 'text-[var(--accent)]',
    badgeClass: 'border-[var(--accent)] bg-[var(--accent-d)] text-[var(--accent)]',
    chipActiveClass: 'border-[var(--accent)] bg-[var(--accent-d)] text-[var(--accent)] shadow-[0_0_12px_rgba(59,130,246,0.28)]',
    chipIdleClass: 'border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:text-[var(--accent)]',
    pulse: true,
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SearchScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasAiSearchAsk = useFeatureFlag('ai-search-ask')

  // Query + mode
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('bytes')
  const [modeSource, setModeSource] = useState<ModeSource>('intent')
  const [isFocused, setIsFocused] = useState(false)

  // Results
  const [contentResults, setContentResults] = useState<Post[]>([])
  const [peopleResults, setPeopleResults] = useState<PersonResult[]>([])
  const [ragAnswer, setRagAnswer] = useState<string | null>(null)
  const [ragSources, setRagSources] = useState<SearchAskSource[]>([])
  const [similarByteId, setSimilarByteId] = useState<string | null>(null)
  const [similarResults, setSimilarResults] = useState<SimilarByteResponse[]>([])

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [aiUnavailable, setAiUnavailable] = useState(false)
  const [miniProfilePerson, setMiniProfilePerson] = useState<PersonResult | null>(null)

  // Typewriter state
  const [displayedAnswer, setDisplayedAnswer] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  // ── Typewriter effect ─────────────────────────────────────────────────────

  useEffect(() => {
    if (typewriterRef.current) clearInterval(typewriterRef.current)
    if (!ragAnswer) { setDisplayedAnswer(''); setIsTyping(false); return }

    setDisplayedAnswer('')
    setIsTyping(true)
    let i = 0
    const charDelay = Math.min(10, 1500 / ragAnswer.length)

    typewriterRef.current = setInterval(() => {
      i++
      setDisplayedAnswer(ragAnswer.slice(0, i))
      if (i >= ragAnswer.length) {
        clearInterval(typewriterRef.current!)
        setIsTyping(false)
      }
    }, charDelay)

    return () => { if (typewriterRef.current) clearInterval(typewriterRef.current) }
  }, [ragAnswer])

  // ── Restore search state from URL on back-navigation ─────────────────────

  useEffect(() => {
    const q = searchParams.get('q')
    const m = searchParams.get('mode') as SearchMode
    if (!q || searchParams.get('byteId')) return

    const resolvedMode: SearchMode = (m && ['bytes', 'people', 'ask'].includes(m)) ? m : detectIntent(q, hasAiSearchAsk)
    setQuery(q)
    setMode(resolvedMode)
    setModeSource(m ? 'manual' : 'intent')
    handleSearch(q, resolvedMode)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Similar bytes flow (via ?byteId= query param) ────────────────────────

  useEffect(() => {
    const byteId = searchParams.get('byteId')
    if (!byteId) return
    setSimilarByteId(byteId)
    setMode('bytes')
    setIsLoading(true)
    setHasSearched(true)
    api.getSimilarBytes(byteId)
      .then(setSimilarResults)
      .catch((err: Error) => { if (err.message === 'AI_QUOTA_EXHAUSTED') setAiUnavailable(true) })
      .finally(() => setIsLoading(false))
  }, [searchParams])

  // ── Intent detection ─────────────────────────────────────────────────────

  useEffect(() => {
    if (modeSource === 'intent' && !similarByteId && query.trim()) {
      setMode(detectIntent(query, hasAiSearchAsk))
    }
  }, [query, modeSource, hasAiSearchAsk, similarByteId])

  // ── Helpers ───────────────────────────────────────────────────────────────

  const resetResults = useCallback(() => {
    setContentResults([])
    setPeopleResults([])
    setRagAnswer(null)
    setRagSources([])
    setSimilarResults([])
    setSimilarByteId(null)
    setHasSearched(false)
    setAiUnavailable(false)
    setDisplayedAnswer('')
    setIsTyping(false)
    router.replace(window.location.pathname, { scroll: false })
  }, [router])

  const handleQueryChange = (value: string) => {
    setQuery(value)
    if (!value.trim()) { setModeSource('intent'); resetResults(); return }
    if (hasSearched) resetResults()
  }

  const handleModeOverride = (m: SearchMode) => {
    setMode(m)
    setModeSource('manual')
    resetResults()
    inputRef.current?.focus()
  }

  const handleSearch = async (queryOverride?: string, modeOverride?: SearchMode) => {
    const raw = (queryOverride ?? query).trim()
    if (!raw) return

    const activeMode = modeOverride ?? mode

    const cleanQuery = activeMode === 'people' && raw.startsWith('@')
      ? raw.slice(1)
      : activeMode === 'ask' && raw.startsWith('?')
      ? raw.slice(1).trim()
      : raw

    setIsLoading(true)
    setHasSearched(true)
    setRagAnswer(null)
    setRagSources([])

    // Persist query + mode so Next.js restores correct tab on back-navigation
    router.replace(`?q=${encodeURIComponent(cleanQuery)}&mode=${activeMode}`, { scroll: false })

    try {
      if (activeMode === 'ask') {
        const result = await api.searchAsk(cleanQuery, 'bytes')
        setRagAnswer(result.answer)
        setRagSources(result.sources)
        setContentResults([])
        setPeopleResults([])
      } else if (activeMode === 'people') {
        const results = await api.searchPeople(cleanQuery)
        setPeopleResults(results)
        setContentResults([])
      } else {
        const { results } = await api.search({ query: cleanQuery, type: 'bytes' })
        setContentResults(results)
        setPeopleResults([])
      }
    } catch (err) {
      if ((err as Error).message === 'AI_QUOTA_EXHAUSTED') setAiUnavailable(true)
      resetResults()
      setHasSearched(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const cfg = MODE_META[mode]
  const ModeIcon = cfg.Icon
  const totalResults = mode === 'people' ? peopleResults.length : contentResults.length
  const showPreSearch = !hasSearched && !isLoading && !similarByteId
  const availableModes: SearchMode[] = hasAiSearchAsk ? ['bytes', 'ask', 'people'] : ['bytes', 'people']

  const inputBorderClass = isFocused
    ? `${cfg.focusBorder} ${cfg.focusShadow}`
    : 'border-[var(--border-h)]'

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <PhoneFrame>

      {/* ── Search input + chips ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-5 pt-4 pb-3">

        {/* Input row */}
        <div className="flex items-center gap-3">
          <div className={`flex-1 flex items-center gap-3 bg-[var(--bg-el)] border rounded-xl px-4 py-3 transition-all ${inputBorderClass}`}>
            <ModeIcon
              size={15}
              className={`flex-shrink-0 transition-colors ${cfg.iconClass} ${cfg.pulse && isFocused ? 'animate-pulse' : ''}`}
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={cfg.placeholder}
              autoFocus
              className="flex-1 bg-transparent font-mono text-xs text-[var(--t1)] outline-none placeholder:text-[var(--t2)] min-w-0"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setModeSource('intent'); resetResults() }}
                className="text-[var(--t2)] hover:text-[var(--t1)] transition-colors flex-shrink-0"
              >
                <X size={14} />
              </button>
            )}
            <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border flex-shrink-0 transition-all ${cfg.badgeClass}`}>
              {cfg.label}
            </span>
          </div>
          <button
            onClick={() => router.back()}
            className="font-mono text-[10px] font-bold tracking-[0.08em] text-[var(--accent)] flex-shrink-0"
          >
            CANCEL
          </button>
        </div>

        {/* Mode override chips */}
        {!similarByteId && (
          <div className="flex gap-2 mt-2.5">
            {availableModes.map((m) => {
              const chipLabels: Record<SearchMode, string> = { bytes: 'BYTES', ask: 'ASK AI', people: 'PEOPLE' }
              const isActive = mode === m
              return (
                <button
                  key={m}
                  onClick={() => handleModeOverride(m)}
                  className={`font-mono text-[10px] font-bold px-3 py-1 rounded-lg border transition-all ${isActive ? cfg.chipActiveClass : MODE_META[m].chipIdleClass}`}
                >
                  {chipLabels[m]}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">

        {/* Pre-search: BYTES — empty state */}
        {showPreSearch && mode === 'bytes' && (
          <div className="px-5 py-3">
            <div className="border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] rounded-xl px-5 py-8
                            text-center flex flex-col items-center gap-2">
              <Search size={20} className="text-[var(--accent)] opacity-50" />
              <p className="font-mono text-xs font-bold text-[var(--t1)]">SEARCH BYTES</p>
              <p className="text-xs text-[var(--t2)]">Search anything — topics, titles, or ideas</p>
            </div>
          </div>
        )}

        {/* Pre-search: ASK AI — empty state */}
        {showPreSearch && mode === 'ask' && (
          <div className="px-5 py-3">
            <div className="border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] rounded-xl px-5 py-8
                            text-center flex flex-col items-center gap-2">
              <Bot size={20} className="text-[var(--accent)] opacity-50" />
              <p className="font-mono text-xs font-bold text-[var(--t1)]">ASK AI</p>
              <p className="text-xs text-[var(--t2)]">AI searches bytes and synthesises an answer</p>
            </div>
          </div>
        )}

        {/* Pre-search: PEOPLE — empty state */}
        {showPreSearch && mode === 'people' && (
          <div className="px-5 py-3">
            <div className="border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] rounded-xl px-5 py-8
                            text-center flex flex-col items-center gap-2">
              <Users size={20} className="text-[var(--accent)] opacity-50" />
              <p className="font-mono text-xs font-bold text-[var(--t1)]">SEARCH PEOPLE</p>
              <p className="text-xs text-[var(--t2)]">Find engineers and developers by name or username</p>
            </div>
          </div>
        )}

        {/* Loading — AI mode: skeleton card */}
        {isLoading && mode === 'ask' && (
          <div className="px-5 py-4">
            <div className="rounded-xl border border-[var(--accent)] bg-[var(--accent-d)] overflow-hidden shadow-[0_0_24px_rgba(59,130,246,0.12)]">
              <div className="h-px bg-gradient-to-r from-[var(--accent)] via-[rgba(59,130,246,0.3)] to-transparent" />
              <div className="p-4 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-[3px] h-3.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                  <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.08em] flex items-center gap-1.5">
                    <Bot size={11} className="text-[var(--accent)]" /> AI THINKING
                  </span>
                  <div className="flex gap-1 ml-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:0s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce [animation-delay:0.3s]" />
                  </div>
                </div>
                <p className="text-xs text-[var(--t2)]">Searching bytes and synthesising an answer…</p>
                <div className="flex flex-col gap-2.5">
                  {[100, 88, 94, 72, 82].map((w, i) => (
                    <div key={i} className="h-2 rounded-full bg-[rgba(59,130,246,0.12)] animate-pulse" style={{ width: `${w}%`, animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading — bytes/people/similar: simple indicator */}
        {isLoading && mode !== 'ask' && (
          <div className="flex items-center justify-center h-32">
            <span className="font-mono text-xs text-[var(--accent)] animate-pulse">
              {similarByteId ? 'FINDING SIMILAR…' : 'SEARCHING…'}
            </span>
          </div>
        )}

        {/* AI quota banner */}
        {aiUnavailable && (
          <div className="mx-5 mt-4 rounded-xl border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] px-4 py-3">
            <p className="text-xs text-[var(--t2)]">
              AI features unavailable — daily quota exhausted. Resets at UTC midnight.
            </p>
          </div>
        )}

        {/* ── Similar bytes results ──────────────────────────────────────── */}
        {!isLoading && similarByteId && similarResults.length > 0 && (
          <div className="px-5 py-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="w-[3px] h-3.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
              <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.08em]">
                SIMILAR BYTES ({similarResults.length})
              </span>
            </div>
            {similarResults.map((b) => (
              <button
                key={b.id}
                onClick={() => router.push(`/post/${b.id}`)}
                className="text-left rounded-xl border border-[var(--border-h)] bg-[var(--bg-card)] overflow-hidden
                           transition-all hover:border-[var(--accent)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
              >
                <div className="h-px bg-gradient-to-r from-[var(--accent)] via-[rgba(59,130,246,0.3)] to-transparent" />
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-6 h-6 rounded-full border border-[var(--border-h)] flex items-center justify-center
                                    font-mono text-[10px] bg-[var(--bg-el)] text-[var(--accent)]">
                      {b.authorUsername?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                    <span className="font-mono text-[11px] text-[var(--t2)]">@{b.authorUsername}</span>
                  </div>
                  <h3 className="font-bold text-sm text-[var(--t1)] mb-1.5">{b.title}</h3>
                  <p className="text-xs text-[var(--t2)] leading-relaxed mb-3 line-clamp-2">{b.body}</p>
                  {b.tags.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mb-2.5">
                      {b.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="font-mono text-[10px] py-0.5 px-2 rounded border
                                                    border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t2)]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-4 font-mono text-[10px] text-[var(--t2)]">
                    <span>❤️ {b.likeCount ?? 0}</span>
                    <span>💬 {b.commentCount ?? 0}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Similar bytes — empty */}
        {!isLoading && similarByteId && similarResults.length === 0 && !aiUnavailable && hasSearched && (
          <div className="px-5 pt-4">
            <div className="border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] rounded-xl px-5 py-8
                            text-center flex flex-col items-center gap-2">
              <Layers size={20} className="text-[var(--accent)] opacity-50" />
              <p className="font-mono text-xs font-bold text-[var(--t1)]">NO SIMILAR BYTES</p>
              <p className="text-xs text-[var(--t2)]">This byte doesn&apos;t have a semantic embedding yet</p>
            </div>
          </div>
        )}

        {/* ── RAG answer ────────────────────────────────────────────────── */}
        {!isLoading && hasSearched && ragAnswer && (
          <div className="px-5 py-4 flex flex-col gap-4">

            {/* AI answer card */}
            <div className="rounded-xl border border-[var(--accent)] bg-[var(--accent-d)] overflow-hidden shadow-[0_0_28px_rgba(59,130,246,0.14)]">
              <div className="h-px bg-gradient-to-r from-[var(--accent)] via-[rgba(59,130,246,0.3)] to-transparent" />
              <div className="p-4 flex flex-col gap-4">

                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-[3px] h-3.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                    <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.08em] flex items-center gap-1.5">
                      <Bot size={11} className="text-[var(--accent)]" /> AI ANSWER
                    </span>
                    {isTyping && (
                      <span className="font-mono text-[10px] text-[var(--accent)] animate-pulse ml-1">●</span>
                    )}
                  </div>
                  <button
                    onClick={() => { setRagAnswer(null); setHasSearched(false) }}
                    className="text-[var(--t2)] hover:text-[var(--t1)] transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Structured answer body */}
                <div className="flex flex-col gap-2">
                  {renderAnswer(displayedAnswer)}
                  {isTyping && (
                    <span className="inline-block w-0.5 h-3.5 bg-[var(--accent)] animate-pulse rounded-full" />
                  )}
                </div>
              </div>
            </div>

            {/* Sources */}
            {ragSources.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-[3px] h-3.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                  <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.08em]">
                    SOURCES ({ragSources.length})
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {ragSources.map((src, i) => (
                    <button
                      key={src.id}
                      onClick={() => router.push(`/post/${src.id}`)}
                      className="text-left rounded-xl border border-[var(--border-h)] bg-[var(--bg-card)] overflow-hidden
                                 transition-all hover:border-[var(--accent)] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
                    >
                      <div className="h-px bg-gradient-to-r from-[var(--accent)] via-[rgba(59,130,246,0.3)] to-transparent" />
                      <div className="flex items-start gap-3 px-3 py-3">
                        <span className="font-mono text-[10px] font-bold text-[var(--accent)] flex-shrink-0 w-5 mt-0.5">[{i + 1}]</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-[11px] font-bold text-[var(--t1)] truncate">{src.title}</div>
                          {'body' in src && (src as { body?: string }).body && (
                            <p className="text-xs text-[var(--t2)] mt-1 leading-relaxed line-clamp-2">
                              {(src as { body?: string }).body}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="font-mono text-[10px] text-[var(--t2)] uppercase tracking-[0.06em]">{src.contentType}</span>
                          </div>
                        </div>
                        <span className="font-mono text-[10px] text-[var(--accent)] flex-shrink-0 mt-0.5
                                         px-2 py-0.5 rounded border border-[rgba(59,130,246,0.3)] bg-[rgba(59,130,246,0.08)]">
                          READ →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Regular search results ─────────────────────────────────────── */}
        {!isLoading && hasSearched && !ragAnswer && !similarByteId && (
          <div className="px-5 py-4 flex flex-col gap-4">

            {/* Result count */}
            {totalResults > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-[3px] h-3.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                <span className="font-mono text-xs font-bold text-[var(--t1)] tracking-[0.08em]">
                  {totalResults} RESULT{totalResults !== 1 ? 'S' : ''}
                </span>
              </div>
            )}

            {/* Bytes results */}
            {mode === 'bytes' && (
              <div className="flex flex-col gap-2">
                {contentResults.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => router.push(`/post/${post.id}`)}
                    className="text-left rounded-xl border border-[var(--border-h)] bg-[var(--bg-card)] overflow-hidden
                               transition-all hover:border-[var(--accent)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
                  >
                    <div className="h-px bg-gradient-to-r from-[var(--accent)] via-[rgba(59,130,246,0.3)] to-transparent" />
                    <div className="px-4 pt-3.5 pb-4">
                      <div className="flex items-center gap-2.5 mb-3">
                        <Avatar
                          initials={post.author.initials || (post.author.username?.[0] ?? 'U').toUpperCase()}
                          imageUrl={post.author.avatarUrl}
                          size="sm"
                          variant="cyan"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-[11px] font-bold text-[var(--t1)] flex items-center gap-1.5">
                            @{post.author.username}
                            {post.author.isVerified && (
                              <span className="text-[10px] text-[var(--accent)]">✦</span>
                            )}
                          </div>
                        </div>
                        <span className="font-mono text-[10px] text-[var(--t2)] flex-shrink-0">{post.createdAt}</span>
                      </div>

                      <h3 className="font-bold text-sm text-[var(--t1)] mb-1.5">{post.title}</h3>
                      <p className="text-xs text-[var(--t2)] leading-relaxed mb-3 line-clamp-3">
                        {query.length >= 3
                          ? post.body
                              .split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
                              .map((part, i) =>
                                part.toLowerCase() === query.toLowerCase() ? (
                                  <mark key={i} className="bg-[var(--accent-d)] text-[var(--accent)] px-0.5 rounded">
                                    {part}
                                  </mark>
                                ) : part
                              )
                          : post.body}
                      </p>

                      {post.tags.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap mb-3">
                          {post.tags.slice(0, 5).map((tag) => (
                            <span key={tag} className="font-mono text-[10px] py-0.5 px-2 rounded border
                                                        border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t2)]">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex gap-4 font-mono text-[10px] text-[var(--t2)]">
                          <span>❤️ {post.likes ?? 0}</span>
                          <span>💬 {post.comments ?? 0}</span>
                        </div>
                        <span className="font-mono text-[10px] font-bold text-[var(--accent)]
                                         px-3 py-1 rounded-lg border border-[rgba(59,130,246,0.3)]
                                         bg-[rgba(59,130,246,0.08)] hover:border-[var(--accent)]
                                         shadow-[0_0_8px_rgba(59,130,246,0.12)] transition-all">
                          READ →
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* People results */}
            {mode === 'people' && (
              <div className="flex flex-col gap-2">
                {peopleResults.map((person) => (
                  <button
                    key={person.id}
                    onClick={() => setMiniProfilePerson(person)}
                    className="text-left w-full rounded-xl border border-[var(--border-h)] bg-[var(--bg-card)] overflow-hidden
                               transition-all hover:border-[var(--accent)] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
                  >
                    <div className="h-px bg-gradient-to-r from-[var(--accent)] via-[rgba(59,130,246,0.3)] to-transparent" />
                    <div className="flex items-center gap-3 px-4 py-3.5">
                      <Avatar
                        initials={person.displayName?.[0]?.toUpperCase() ?? person.username[0].toUpperCase()}
                        imageUrl={person.avatarUrl}
                        size="sm"
                        variant="purple"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-xs font-bold text-[var(--t1)] flex items-center gap-1.5">
                          {person.displayName || person.username}
                          {person.isVerified && (
                            <span className="text-[10px] text-[var(--accent)]">✦</span>
                          )}
                        </div>
                        <div className="font-mono text-[11px] text-[var(--accent)] mt-0.5">@{person.username}</div>
                        {person.bio && (
                          <div className="text-xs text-[var(--t2)] mt-1 line-clamp-2 leading-relaxed">
                            {person.bio}
                          </div>
                        )}
                      </div>
                      <span className="font-mono text-[10px] font-bold text-[var(--accent)] flex-shrink-0
                                       px-3 py-1 rounded-lg border border-[rgba(59,130,246,0.3)]
                                       bg-[rgba(59,130,246,0.08)] shadow-[0_0_8px_rgba(59,130,246,0.12)]">
                        VIEW →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No results */}
            {totalResults === 0 && (
              <div className="border border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] rounded-xl px-5 py-8
                              text-center flex flex-col items-center gap-2">
                <Search size={20} className="text-[var(--accent)] opacity-50" />
                <p className="font-mono text-xs font-bold text-[var(--t1)]">NOTHING FOUND</p>
                <p className="text-xs text-[var(--t2)]">
                  {hasAiSearchAsk
                    ? 'Try a different term or type ? to ask AI'
                    : 'Try a different search term'}
                </p>
              </div>
            )}

            {miniProfilePerson && (
              <UserMiniProfile
                userId={miniProfilePerson.id}
                username={miniProfilePerson.username}
                displayName={miniProfilePerson.displayName}
                initials={miniProfilePerson.displayName?.[0]?.toUpperCase() ?? miniProfilePerson.username[0].toUpperCase()}
                avatarUrl={miniProfilePerson.avatarUrl}
                onClose={() => setMiniProfilePerson(null)}
              />
            )}
          </div>
        )}

      </div>
    </PhoneFrame>
  )
}
