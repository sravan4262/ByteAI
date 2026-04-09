"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { PhoneFrame } from '@/components/layout/phone-frame'
import { Avatar } from '@/components/layout/avatar'
import { mockPosts } from '@/lib/mock-data'
import * as api from '@/lib/api'
import type { Post } from '@/lib/api'

const SEARCH_FILTERS = ['ALL', 'BYTES', 'PEOPLE'] as const
type SearchFilter = (typeof SEARCH_FILTERS)[number]

export function SearchScreen() {
  const router = useRouter()
  const [query, setQuery] = useState('react')
  const [activeFilter, setActiveFilter] = useState<SearchFilter>('ALL')
  const [results] = useState(mockPosts)

  const handleSearch = async () => {
    await api.search({ query, filter: activeFilter.toLowerCase() as 'all' | 'bytes' | 'devs' | 'topics' | 'code' })
  }

  const topics = [
    { name: '#REACT', count: '2,841 bytes', color: 'bg-gradient-to-br from-[#1a1040] to-[#2563eb]' },
    { name: '#REACT-NATIVE', count: '983 bytes', color: 'bg-gradient-to-br from-[#0a1e14] to-[#145840]' },
  ]

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
                onChange={(e) => {
                  setQuery(e.target.value)
                  handleSearch()
                }}
                placeholder="Search bytes, topics, devs..."
                className="w-full bg-[var(--bg-el)] border border-[var(--border-m)] rounded-lg py-[11px] pl-4 pr-10 font-mono text-[11px] text-[var(--t1)] outline-none transition-all placeholder:text-[var(--t3)] focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.14)]"
              />
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--t3)]" />
            </div>
            <button
              onClick={() => router.back()}
              className="font-mono text-[9px] text-[var(--accent)] font-bold tracking-[0.08em]"
            >
              CANCEL
            </button>
          </div>

          <div className="flex gap-2 mt-[10px]">
            {SEARCH_FILTERS.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`font-mono text-[10px] px-4 py-2 rounded-full transition-all border ${
                  activeFilter === filter
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-[0_2px_12px_var(--accent-glow)]'
                    : 'text-[var(--t2)] border-[var(--border-m)] hover:text-[var(--t1)] hover:border-[var(--border-h)]'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">
        <div className="px-5 py-4">
          <div className="font-mono text-[8px] tracking-[0.1em] text-[var(--t2)] mb-4">
            RESULTS FOR &quot;<span className="text-[var(--t1)]">{query}</span>&quot; ·{' '}
            <span className="text-[var(--accent)]">142 BYTES</span>
          </div>

          <div className="flex flex-col gap-4">
            {results.map((post) => (
              <button
                key={post.id}
                onClick={() => router.push(`/post/${post.id}`)}
                className="text-left bg-[var(--bg-card)] border border-[var(--border-m)] rounded-lg p-4 transition-all hover:border-[var(--border-h)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
              >
                <div className="flex items-center gap-[10px] mb-3">
                  <Avatar
                    initials={post.author.initials}
                    size="sm"
                    variant={post.author.id === '1' ? 'cyan' : post.author.id === '4' ? 'purple' : 'green'}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[10px] font-bold text-[var(--t1)] flex items-center gap-1.5">
                      @{post.author.username}
                      {post.author.isVerified && (
                        <span className="text-[8px] text-[var(--accent)]">✦</span>
                      )}
                    </div>
                    <div className="font-mono text-[8px] text-[var(--t2)]">
                      {post.author.role} @ {post.author.company}
                    </div>
                  </div>
                  <span className="font-mono text-[7px] text-[var(--t3)]">{post.createdAt}</span>
                </div>

                <h3 className="font-bold text-sm mb-2">{post.title}</h3>

                <p className="text-[11px] text-[var(--t2)] leading-relaxed mb-3">
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

                <div className="flex gap-[5px] flex-wrap mb-3">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="font-mono text-[8px] py-[3px] px-2 rounded border border-[var(--border-m)] text-[var(--t2)] bg-[var(--bg-el)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex gap-4 font-mono text-[8px] text-[var(--t2)]">
                  <span>💡 {post.reactions.find((r) => r.emoji === '💡')?.count || 0}</span>
                  <span>❤️ {post.reactions.find((r) => r.emoji === '❤️')?.count || 0}</span>
                  <span>💬 {post.comments}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6">
            <div className="font-mono text-[8px] tracking-[0.1em] text-[var(--t2)] mb-3">RELATED_TOPICS</div>
            <div className="grid grid-cols-2 gap-3">
              {topics.map((topic) => (
                <button
                  key={topic.name}
                  className={`${topic.color} border border-[var(--border-m)] rounded-lg p-4 text-left transition-all hover:border-[var(--border-h)] hover:-translate-y-0.5`}
                >
                  <div className="font-mono text-[10px] font-bold text-[var(--t1)]">{topic.name}</div>
                  <div className="font-mono text-[8px] text-[var(--t2)] mt-1">{topic.count}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  )
}
