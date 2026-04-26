"use client"

import { useEffect, useState } from 'react'
import { SearchableDropdown } from '@/components/ui/searchable-dropdown'
import { getTechStacks, type TechStackResponse } from '@/lib/api/client'

interface FeedFiltersProps {
  activeTab: string
  activeStackFilter: string[]
  onTabChange: (tab: string) => void
  onStackFilter: (stack: string[]) => void
}

const TABS = [
  { id: 'for_you', label: 'FOR_YOU' },
  { id: 'trending', label: 'TRENDING' },
]

export function FeedFilters({
  activeTab,
  activeStackFilter,
  onTabChange,
  onStackFilter,
}: FeedFiltersProps) {
  const [techOptions, setTechOptions] = useState<{ value: string; label: string }[]>([])

  useEffect(() => {
    getTechStacks().then((stacks: TechStackResponse[]) => {
      const options = stacks
        .map((s) => ({ value: s.name, label: s.label }))
        .sort((a, b) => a.label.localeCompare(b.label))
      setTechOptions(options)
    })
  }, [])

  return (
    <div className="flex-shrink-0 bg-[var(--bg-o80)] backdrop-blur-sm border-b border-[var(--border)] relative z-20">
      <div>
        {/* Tabs row */}
        <div className="flex items-center gap-2 px-4 py-3">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`font-mono text-[11px] md:text-xs tracking-[0.07em] py-1.5 px-4 rounded-lg border transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-[var(--accent)] border-[var(--accent)] bg-[var(--accent-d)] shadow-[0_0_12px_rgba(59,130,246,0.2)]'
                  : 'text-[var(--t1)] border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:text-[var(--accent)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tech stack filter — FOR_YOU only */}
        {activeTab === 'for_you' && (
          <div className="flex items-center gap-3 px-4 py-2.5">
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="w-[3px] h-3.5 rounded-full bg-[var(--accent)]" />
              <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.08em]">
                TECH_STACK
              </span>
            </div>
            <SearchableDropdown
              multiple
              options={techOptions}
              value={activeStackFilter}
              onChange={onStackFilter}
              placeholder="TECH STACK"
              allLabel="ALL STACKS"
              accentColor="accent"
            />
            {activeStackFilter.length > 0 && (
              <span className="font-mono text-xs font-bold text-[var(--t1)]">
                Filtering by <span className="text-[var(--accent)]">{activeStackFilter.join(', ')}</span>
              </span>
            )}
          </div>
        )}

        {/* Trending indicator */}
        {activeTab === 'trending' && (
          <div className="px-4 py-3">
            <div className="font-mono text-[11px] md:text-xs text-[var(--t1)] flex items-center gap-2">
              <span className="text-[var(--orange)]">🔥</span>
              MOST VIEWED IN LAST 24 HOURS
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
