"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Bot, X, Layers } from 'lucide-react'
import { PhoneFrame } from '@/components/layout/phone-frame'
import { Avatar } from '@/components/layout/avatar'
import { UserMiniProfile } from '@/components/features/profile/user-mini-profile'
import { useFeatureFlag } from '@/hooks/use-feature-flags'
import * as api from '@/lib/api'
import type { Post, PersonResult, SearchAskSource, SimilarByteResponse } from '@/lib/api'

const SEARCH_TYPES = [
  { id: 'bytes', label: 'BYTES' },
  { id: 'interviews', label: 'INTERVIEWS' },
  { id: 'people', label: 'PEOPLE' },
] as const

type SearchType = (typeof SEARCH_TYPES)[number]['id']

export function SearchScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState('')
  const [selectedType, setSelectedType] = useState<SearchType | null>(null)
  const [contentResults, setContentResults] = useState<Post[]>([])
  const [peopleResults, setPeopleResults] = useState<PersonResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [aiUnavailable, setAiUnavailable] = useState(false)
  const hasAiSearchAsk = useFeatureFlag('ai-search-ask')

  // RAG / ASK mode
  const [askMode, setAskMode] = useState(false)
  const [ragAnswer, setRagAnswer] = useState<string | null>(null)
  const [ragSources, setRagSources] = useState<SearchAskSource[]>([])
  const [miniProfilePerson, setMiniProfilePerson] = useState<PersonResult | null>(null)

  // Similar bytes mode — triggered from byte detail screen via ?byteId=
  const [similarByteId, setSimilarByteId] = useState<string | null>(null)
  const [similarResults, setSimilarResults] = useState<SimilarByteResponse[]>([])

  useEffect(() => {
    const byteId = searchParams.get('byteId')
    if (!byteId) return
    setSimilarByteId(byteId)
    setSelectedType('bytes')
    setIsLoading(true)
    setHasSearched(true)
    api.getSimilarBytes(byteId).then((results) => {
      setSimilarResults(results)
    }).catch((err: Error) => {
      if (err.message === 'AI_QUOTA_EXHAUSTED') setAiUnavailable(true)
    }).finally(() => setIsLoading(false))
  }, [searchParams])

  const resetResults = () => {
    setContentResults([])
    setPeopleResults([])
    setRagAnswer(null)
    setRagSources([])
    setSimilarResults([])
    setSimilarByteId(null)
    setHasSearched(false)
    setAiUnavailable(false)
  }

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsLoading(true)
    setHasSearched(true)

    try {
      // Option B: no type selected → NLP RAG over both bytes + interviews
      if (!selectedType || askMode) {
        const type = selectedType === 'bytes' ? 'bytes'
                   : selectedType === 'interviews' ? 'interviews'
                   : undefined
        const result = await api.searchAsk(query.trim(), type)
        setRagAnswer(result.answer)
        setRagSources(result.sources)
        setContentResults([])
        setPeopleResults([])
        return
      }

      if (selectedType === 'people') {
        const results = await api.searchPeople(query.trim())
        setPeopleResults(results)
        setContentResults([])
      } else {
        const { results } = await api.search({ query: query.trim(), type: selectedType })
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

  const handleQueryChange = (value: string) => {
    setQuery(value)
    if (hasSearched) resetResults()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleTypeSelect = (type: SearchType) => {
    setSelectedType(type)
    setAskMode(false)
    resetResults()
  }

  const toggleAskMode = () => {
    if (!hasAiSearchAsk) {
      // Silently prevent enabling ask mode if feature not available
      return
    }
    setAskMode((v) => !v)
    resetResults()
  }

  const isRagMode = !selectedType || askMode
  const totalResults = selectedType === 'people' ? peopleResults.length : contentResults.length

  return (
    <PhoneFrame>
      {/* Header with search */}
      <div className="flex-shrink-0 border-b border-[var(--border)] bg-[var(--bg-o95)] backdrop-blur-md">
        <div className="px-5 py-[13px] pb-[11px]">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isRagMode && selectedType
                    ? `Ask AI about ${selectedType}...`
                    : isRagMode
                    ? 'Ask anything about tech...'
                    : selectedType === 'people'
                    ? 'Search by username or name...'
                    : `Search ${selectedType}...`
                }
                className="w-full bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg py-[11px] pl-4 pr-10 font-mono text-[11px] text-[var(--t1)] outline-none transition-all placeholder:text-[var(--t3)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.14)]"
              />
              <button
                onClick={handleSearch}
                disabled={!query.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--t3)] hover:text-[var(--accent)] disabled:opacity-30 transition-all"
              >
                {isRagMode ? <Bot size={14} className="text-[var(--accent)]" /> : <Search size={14} />}
              </button>
            </div>
            <button
              onClick={() => router.back()}
              className="font-mono text-[9px] text-[var(--accent)] font-bold tracking-[0.08em]"
            >
              CANCEL
            </button>
          </div>

          {/* Type selector + ASK AI toggle */}
          <div className="flex gap-2 mt-[10px] items-center">
            {SEARCH_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTypeSelect(t.id)}
                className={`font-mono text-[10px] px-4 py-2 rounded-full transition-all border ${
                  selectedType === t.id && !askMode
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-[0_2px_12px_var(--accent-glow)]'
                    : 'text-[var(--t2)] border-[var(--border-m)] hover:text-[var(--t1)] hover:border-[var(--border-h)]'
                }`}
              >
                {t.label}
              </button>
            ))}

            {/* ASK AI toggle — only for bytes/interviews, not people */}
            {selectedType && selectedType !== 'people' && hasAiSearchAsk && (
              <button
                onClick={toggleAskMode}
                className={`ml-auto flex items-center gap-1 font-mono text-[9px] px-3 py-2 rounded-full transition-all border ${
                  askMode
                    ? 'bg-[var(--accent-d)] text-[var(--accent)] border-[var(--accent)]'
                    : 'text-[var(--t3)] border-[var(--border-m)] hover:text-[var(--accent)] hover:border-[var(--accent)]'
                }`}
              >
                <Bot size={10} /> ASK
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">

        {/* Initial state — show ASK ANYTHING prompt */}
        {!hasSearched && !isLoading && !similarByteId && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-4">
            <div className={`w-12 h-12 rounded-full border flex items-center justify-center ${
              isRagMode
                ? 'bg-[var(--accent-d)] border-[var(--accent)]'
                : 'bg-[var(--bg-el)] border-[var(--border-m)]'
            }`}>
              {isRagMode ? <Bot size={20} className="text-[var(--accent)]" /> : <Search size={20} className="text-[var(--t3)]" />}
            </div>
            <div>
              {isRagMode ? (
                <>
                  <div className="font-mono text-xs font-bold text-[var(--accent)] mb-1">ASK AI</div>
                  <div className="font-mono text-[10px] text-[var(--t3)]">
                    {selectedType
                      ? `Ask a question — AI will search ${selectedType} and synthesise an answer`
                      : 'Ask any tech question — AI searches bytes + interviews and synthesises an answer'}
                  </div>
                </>
              ) : (
                <>
                  <div className="font-mono text-xs font-bold text-[var(--t1)] mb-1">
                    {selectedType ? `SEARCH ${selectedType.toUpperCase()}` : 'SELECT A CATEGORY'}
                  </div>
                  <div className="font-mono text-[10px] text-[var(--t3)]">
                    {selectedType
                      ? 'Type a query and press Enter, or tap ASK for AI answers'
                      : 'Choose Bytes, Interviews, or People — or type to ask AI directly'}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className={`font-mono text-xs animate-pulse ${similarByteId ? 'text-[var(--accent)]' : isRagMode ? 'text-[var(--accent)]' : 'text-[var(--t2)]'}`}>
              {similarByteId ? 'FINDING SIMILAR...' : isRagMode ? 'THINKING...' : 'SEARCHING...'}
            </div>
          </div>
        )}

        {/* AI unavailable banner */}
        {aiUnavailable && (
          <div className="mx-5 mt-4 rounded-xl border border-[var(--border-m)] bg-[var(--bg-el)] px-4 py-3 flex items-center gap-2">
            <span className="font-mono text-[9px] text-[var(--t2)]">AI features are unavailable — daily quota exhausted. Resets at UTC midnight.</span>
          </div>
        )}

        {/* Similar Bytes results */}
        {!isLoading && similarByteId && similarResults.length > 0 && (
          <div className="px-5 py-4">
            <div className="font-mono text-[8px] tracking-[0.1em] text-[var(--accent)] mb-4 flex items-center gap-1.5">
              <Layers size={10} /> SIMILAR BYTES ({similarResults.length})
            </div>
            <div className="flex flex-col gap-4">
              {similarResults.map((b) => (
                <button
                  key={b.id}
                  onClick={() => router.push(`/post/${b.id}`)}
                  className="text-left bg-[var(--bg-card)] border border-[var(--border-m)] rounded-lg p-4 transition-all hover:border-[var(--border-h)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
                >
                  <div className="flex items-center gap-[10px] mb-2">
                    <div className="w-6 h-6 rounded-full border border-[var(--border-m)] flex items-center justify-center font-mono text-[8px] bg-[var(--bg-el)] text-[var(--accent)]">
                      {b.authorUsername?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                    <span className="font-mono text-[9px] text-[var(--t2)]">@{b.authorUsername}</span>
                  </div>
                  <h3 className="font-bold text-sm mb-2">{b.title}</h3>
                  <p className="text-[11px] text-[var(--t2)] leading-relaxed mb-3 line-clamp-2">{b.body}</p>
                  {b.tags.length > 0 && (
                    <div className="flex gap-[5px] flex-wrap mb-2">
                      {b.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="font-mono text-[8px] py-[3px] px-2 rounded border border-[var(--border-m)] text-[var(--t2)] bg-[var(--bg-el)]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-4 font-mono text-[8px] text-[var(--t2)]">
                    <span>❤️ {b.likeCount ?? 0}</span>
                    <span>💬 {b.commentCount ?? 0}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Similar Bytes — no results */}
        {!isLoading && similarByteId && similarResults.length === 0 && !aiUnavailable && hasSearched && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-8">
            <div className="font-mono text-sm text-[var(--t1)] mb-2">NO SIMILAR BYTES</div>
            <div className="font-mono text-[10px] text-[var(--t2)]">This byte doesn&apos;t have a semantic embedding yet</div>
          </div>
        )}

        {/* RAG answer panel */}
        {!isLoading && hasSearched && ragAnswer && (
          <div className="px-5 py-4 flex flex-col gap-4">
            <div className="rounded-xl border border-[var(--accent)] bg-[var(--accent-d)] p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="font-mono text-[9px] font-bold tracking-[0.1em] text-[var(--accent)] flex items-center gap-1.5">
                  <Bot size={11} /> AI ANSWER
                </div>
                <button
                  onClick={() => { setRagAnswer(null); setHasSearched(false) }}
                  className="text-[var(--t3)] hover:text-[var(--t1)]"
                >
                  <X size={13} />
                </button>
              </div>
              <p className="font-mono text-[10px] lg:text-xs leading-relaxed text-[var(--t1)] whitespace-pre-wrap">
                {ragAnswer}
              </p>
            </div>

            {/* Sources */}
            {ragSources.length > 0 && (
              <div>
                <div className="font-mono text-[8px] tracking-[0.1em] text-[var(--t3)] mb-2">
                  SOURCES ({ragSources.length})
                </div>
                <div className="flex flex-col gap-2">
                  {ragSources.map((src, i) => (
                    <button
                      key={src.id}
                      onClick={() => router.push(`/post/${src.id}`)}
                      className="flex items-center gap-3 text-left bg-[var(--bg-card)] border border-[var(--border-m)] rounded-lg px-3 py-2.5 transition-all hover:border-[var(--border-h)] hover:-translate-y-0.5"
                    >
                      <span className="font-mono text-[8px] text-[var(--t3)] flex-shrink-0 w-4">[{i + 1}]</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-[10px] font-bold text-[var(--t1)] truncate">{src.title}</div>
                        <div className="font-mono text-[8px] text-[var(--t3)] mt-0.5 uppercase">{src.contentType}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Regular search results */}
        {!isLoading && hasSearched && !ragAnswer && !similarByteId && (
          <div className="px-5 py-4">
            <div className="font-mono text-[8px] tracking-[0.1em] text-[var(--t2)] mb-4">
              {totalResults === 0
                ? 'NO RESULTS'
                : `${totalResults} RESULT${totalResults !== 1 ? 'S' : ''} FOR "${query}"`}
            </div>

            {/* Content results (bytes / interviews) */}
            {(selectedType === 'bytes' || selectedType === 'interviews') && (
              <div className="flex flex-col gap-4">
                {contentResults.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => router.push(`/post/${post.id}`)}
                    className="text-left bg-[var(--bg-card)] border border-[var(--border-m)] rounded-lg p-4 transition-all hover:border-[var(--border-h)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
                  >
                    <div className="flex items-center gap-[10px] mb-3">
                      <Avatar
                        initials={post.author.initials || (post.author.username?.[0] ?? 'U').toUpperCase()}
                        imageUrl={post.author.avatarUrl}
                        size="sm"
                        variant="cyan"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-[10px] font-bold text-[var(--t1)] flex items-center gap-1.5">
                          @{post.author.username}
                          {post.author.isVerified && (
                            <span className="text-[8px] text-[var(--accent)]">✦</span>
                          )}
                        </div>
                      </div>
                      <span className="font-mono text-[7px] text-[var(--t3)]">{post.createdAt}</span>
                    </div>

                    <h3 className="font-bold text-sm mb-2">{post.title}</h3>
                    <p className="text-[11px] text-[var(--t2)] leading-relaxed mb-3 line-clamp-3">
                      {query.length >= 3
                        ? post.body
                            .split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
                            .map((part, i) =>
                              part.toLowerCase() === query.toLowerCase() ? (
                                <mark key={i} className="bg-[var(--accent-d)] text-[var(--accent)] px-0.5 rounded">
                                  {part}
                                </mark>
                              ) : (
                                part
                              )
                            )
                        : post.body}
                    </p>

                    {post.tags.length > 0 && (
                      <div className="flex gap-[5px] flex-wrap mb-3">
                        {post.tags.slice(0, 5).map((tag) => (
                          <span
                            key={tag}
                            className="font-mono text-[8px] py-[3px] px-2 rounded border border-[var(--border-m)] text-[var(--t2)] bg-[var(--bg-el)]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-4 font-mono text-[8px] text-[var(--t2)]">
                      <span>❤️ {post.likes ?? 0}</span>
                      <span>💬 {post.comments ?? 0}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* People results */}
            {selectedType === 'people' && (
              <div className="flex flex-col gap-3">
                {peopleResults.map((person) => (
                  <button
                    key={person.id}
                    onClick={() => setMiniProfilePerson(person)}
                    className="flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border-m)] rounded-lg p-4 transition-all hover:border-[var(--accent)] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)] text-left w-full"
                  >
                    <Avatar
                      initials={person.displayName?.[0]?.toUpperCase() ?? person.username[0].toUpperCase()}
                      imageUrl={person.avatarUrl}
                      size="sm"
                      variant="purple"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[11px] font-bold text-[var(--t1)] flex items-center gap-1.5">
                        {person.displayName || person.username}
                        {person.isVerified && <span className="text-[8px] text-[var(--accent)]">✦</span>}
                      </div>
                      <div className="font-mono text-[10px] text-[var(--accent)] mt-0.5">@{person.username}</div>
                      {person.bio && (
                        <div className="font-mono text-[9px] text-[var(--t3)] mt-1 line-clamp-2 leading-relaxed">{person.bio}</div>
                      )}
                    </div>
                    <span className="font-mono text-[9px] text-[var(--t3)] flex-shrink-0">VIEW →</span>
                  </button>
                ))}
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

            {/* No results */}
            {totalResults === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="font-mono text-sm text-[var(--t1)] mb-2">NOTHING FOUND</div>
                <div className="font-mono text-[10px] text-[var(--t2)]">
                  Try a different search term or tap ASK for AI answers
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PhoneFrame>
  )
}
