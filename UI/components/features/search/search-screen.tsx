"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { PhoneFrame } from '@/components/layout/phone-frame'
import { Avatar } from '@/components/layout/avatar'
import * as api from '@/lib/api'
import type { Post, PersonResult } from '@/lib/api'

const SEARCH_TYPES = [
  { id: 'bytes', label: 'BYTES' },
  { id: 'interviews', label: 'INTERVIEWS' },
  { id: 'people', label: 'PEOPLE' },
] as const

type SearchType = (typeof SEARCH_TYPES)[number]['id']

export function SearchScreen() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedType, setSelectedType] = useState<SearchType | null>(null)
  const [contentResults, setContentResults] = useState<Post[]>([])
  const [peopleResults, setPeopleResults] = useState<PersonResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    if (!query.trim() || !selectedType) return
    setIsLoading(true)
    setHasSearched(true)
    try {
      if (selectedType === 'people') {
        const results = await api.searchPeople(query.trim())
        setPeopleResults(results)
        setContentResults([])
      } else {
        const { results } = await api.search({ query: query.trim(), type: selectedType })
        setContentResults(results)
        setPeopleResults([])
      }
    } catch {
      setContentResults([])
      setPeopleResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleTypeSelect = (type: SearchType) => {
    setSelectedType(type)
    // Reset results when switching type
    setContentResults([])
    setPeopleResults([])
    setHasSearched(false)
  }

  const totalResults = selectedType === 'people' ? peopleResults.length : contentResults.length

  return (
    <PhoneFrame>
      {/* Header with search */}
      <div className="flex-shrink-0 border-b border-[var(--border)] bg-[rgba(5,5,14,0.95)] backdrop-blur-md">
        <div className="px-5 py-[13px] pb-[11px]">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  !selectedType
                    ? 'Select a category first...'
                    : selectedType === 'people'
                    ? 'Search by username or name...'
                    : `Search ${selectedType}...`
                }
                disabled={!selectedType}
                className="w-full bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg py-[11px] pl-4 pr-10 font-mono text-[11px] text-[var(--t1)] outline-none transition-all placeholder:text-[var(--t3)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.14)] disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSearch}
                disabled={!query.trim() || !selectedType}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--t3)] hover:text-[var(--accent)] disabled:opacity-30 transition-all"
              >
                <Search size={14} />
              </button>
            </div>
            <button
              onClick={() => router.back()}
              className="font-mono text-[9px] text-[var(--accent)] font-bold tracking-[0.08em]"
            >
              CANCEL
            </button>
          </div>

          {/* Type selector */}
          <div className="flex gap-2 mt-[10px]">
            {SEARCH_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTypeSelect(t.id)}
                className={`font-mono text-[10px] px-4 py-2 rounded-full transition-all border ${
                  selectedType === t.id
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-[0_2px_12px_var(--accent-glow)]'
                    : 'text-[var(--t2)] border-[var(--border-m)] hover:text-[var(--t1)] hover:border-[var(--border-h)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">
        {/* Initial state — nothing selected */}
        {!selectedType && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-4">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-el)] border border-[var(--border-m)] flex items-center justify-center">
              <Search size={20} className="text-[var(--t3)]" />
            </div>
            <div>
              <div className="font-mono text-xs font-bold text-[var(--t1)] mb-1">SELECT A CATEGORY</div>
              <div className="font-mono text-[10px] text-[var(--t3)]">
                Choose Bytes, Interviews, or People to start searching
              </div>
            </div>
          </div>
        )}

        {/* Category selected, not yet searched */}
        {selectedType && !hasSearched && (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 gap-4">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-el)] border border-[var(--border-m)] flex items-center justify-center">
              <Search size={20} className="text-[var(--accent)]" />
            </div>
            <div>
              <div className="font-mono text-xs font-bold text-[var(--t1)] mb-1">
                SEARCH {selectedType.toUpperCase()}
              </div>
              <div className="font-mono text-[10px] text-[var(--t3)]">
                Type a query and press Enter or tap the search icon
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="font-mono text-xs text-[var(--t2)] animate-pulse">SEARCHING...</div>
          </div>
        )}

        {/* Results */}
        {!isLoading && hasSearched && (
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
                      {post.body.split(new RegExp(`(${query})`, 'gi')).map((part, i) =>
                        part.toLowerCase() === query.toLowerCase() ? (
                          <mark key={i} className="bg-[var(--accent-d)] text-[var(--accent)] px-0.5 rounded">
                            {part}
                          </mark>
                        ) : (
                          part
                        )
                      )}
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
                  <div
                    key={person.id}
                    className="flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border-m)] rounded-lg p-4 transition-all hover:border-[var(--border-h)]"
                  >
                    <Avatar
                      initials={person.displayName?.[0]?.toUpperCase() ?? person.username[0].toUpperCase()}
                      size="sm"
                      variant="purple"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[11px] font-bold text-[var(--t1)] flex items-center gap-1.5">
                        @{person.username}
                        {person.isVerified && <span className="text-[8px] text-[var(--accent)]">✦</span>}
                      </div>
                      <div className="font-mono text-[10px] text-[var(--t2)] mt-0.5">{person.displayName}</div>
                      {person.bio && (
                        <div className="font-mono text-[9px] text-[var(--t3)] mt-0.5 truncate">{person.bio}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No results */}
            {totalResults === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="font-mono text-sm text-[var(--t1)] mb-2">NOTHING FOUND</div>
                <div className="font-mono text-[10px] text-[var(--t2)]">
                  Try a different search term
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PhoneFrame>
  )
}
