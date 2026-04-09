"use client"

import { SearchableDropdown } from '@/components/ui/searchable-dropdown'
import { sortOptions, allTechStacks } from '@/lib/mock-data'

interface FeedFiltersProps {
  activeTab: string
  sortBy: string
  showSortDropdown: boolean
  activeStackFilter: string | null
  onTabChange: (tab: string) => void
  onSortChange: (sort: string) => void
  onToggleSortDropdown: () => void
  onStackFilter: (stack: string | null) => void
}

const TABS = [
  { id: 'for_you', label: 'FOR_YOU' },
  { id: 'following', label: 'FOLLOWING' },
  { id: 'trending', label: 'TRENDING' },
]

const techOptions = allTechStacks
  .sort((a, b) => a.localeCompare(b))
  .map((t) => ({ value: t, label: t }))

export function FeedFilters({
  activeTab,
  sortBy,
  showSortDropdown,
  activeStackFilter,
  onTabChange,
  onSortChange,
  onToggleSortDropdown,
  onStackFilter,
}: FeedFiltersProps) {
  return (
    <div className="flex-shrink-0 bg-[rgba(5,5,14,0.8)] backdrop-blur-sm border-b border-[var(--border)] relative z-20">
      <div className="max-w-7xl mx-auto">
        {/* Tabs row */}
        <div className="flex items-center px-4 md:px-8 lg:px-12 xl:px-16">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`font-mono text-[11px] md:text-xs lg:text-[13px] tracking-[0.07em] py-3 px-4 border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-[var(--accent)] border-[var(--accent)]'
                  : 'text-[var(--t2)] border-transparent hover:text-[var(--t1)]'
              }`}
            >
              {tab.label}
            </button>
          ))}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Sort dropdown (FOR_YOU only) */}
          {activeTab === 'for_you' && (
            <div className="relative flex items-center">
              <button
                onClick={onToggleSortDropdown}
                className="font-mono text-[11px] md:text-xs tracking-[0.06em] text-[var(--t2)] hover:text-[var(--accent)] flex items-center gap-1 px-3 py-3"
              >
                SORT: {sortOptions.find((s) => s.id === sortBy)?.label} ↓
              </button>
              {showSortDropdown && (
                <div className="absolute top-full right-0 mt-1 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-lg z-20 min-w-[160px]">
                  {sortOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => onSortChange(option.id)}
                      className={`w-full text-left font-mono text-[11px] md:text-xs px-4 py-2.5 transition-all ${
                        sortBy === option.id
                          ? 'text-[var(--accent)] bg-[var(--accent-d)]'
                          : 'text-[var(--t2)] hover:text-[var(--t1)] hover:bg-white/5'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tech stack filter — FOR_YOU only */}
        {activeTab === 'for_you' && (
          <div className="flex items-center gap-3 px-4 md:px-8 lg:px-12 xl:px-16 py-2.5">
            <span className="font-mono text-[10px] tracking-[0.1em] text-[var(--t3)] flex-shrink-0">
              TECH_STACK
            </span>
            <SearchableDropdown
              options={techOptions}
              value={activeStackFilter}
              onChange={onStackFilter}
              placeholder="TECH STACK"
              allLabel="ALL STACKS"
              accentColor="green"
            />
            {activeStackFilter && (
              <span className="font-mono text-[8px] text-[var(--green)]">
                Filtering by <strong>{activeStackFilter}</strong>
              </span>
            )}
          </div>
        )}

        {/* Trending indicator */}
        {activeTab === 'trending' && (
          <div className="px-4 md:px-8 lg:px-12 xl:px-16 py-3">
            <div className="font-mono text-[11px] md:text-xs text-[var(--t2)] flex items-center gap-2">
              <span className="text-[var(--orange)]">🔥</span>
              MOST VIEWED IN LAST 24 HOURS
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
