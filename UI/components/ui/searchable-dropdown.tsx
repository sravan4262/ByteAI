"use client"

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

export interface DropdownOption {
  value: string
  label: string
}

interface SearchableDropdownProps {
  options: DropdownOption[]
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  allLabel?: string
  className?: string
  accentColor?: 'accent' | 'cyan' | 'green' | 'purple'
}

const ACCENT_CLASSES = {
  accent: {
    active: 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-d)]',
    highlight: 'text-[var(--accent)] bg-[var(--accent-d)]',
    ring: 'focus:border-[var(--accent)]',
  },
  cyan: {
    active: 'border-[var(--cyan)] text-[var(--cyan)] bg-[var(--cyan-d)]',
    highlight: 'text-[var(--cyan)] bg-[var(--cyan-d)]',
    ring: 'focus:border-[var(--cyan)]',
  },
  green: {
    active: 'border-[var(--green)] text-[var(--green)] bg-[var(--green-d)]',
    highlight: 'text-[var(--green)] bg-[var(--green-d)]',
    ring: 'focus:border-[var(--green)]',
  },
  purple: {
    active: 'border-[var(--purple)] text-[var(--purple)] bg-[var(--purple-d)]',
    highlight: 'text-[var(--purple)] bg-[var(--purple-d)]',
    ring: 'focus:border-[var(--purple)]',
  },
}

export function SearchableDropdown({
  options,
  value,
  onChange,
  placeholder = 'SELECT',
  allLabel = 'ALL',
  className = '',
  accentColor = 'accent',
}: SearchableDropdownProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const accent = ACCENT_CLASSES[accentColor]

  const selectedLabel = value
    ? options.find((o) => o.value === value)?.label ?? value
    : allLabel

  const filtered = options
    .filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.label.localeCompare(b.label))

  // Close on outside click or ESC
  useEffect(() => {
    const clickHandler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setSearch('') }
    }
    document.addEventListener('mousedown', clickHandler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', clickHandler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const select = (val: string | null) => {
    onChange(val)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 font-mono text-xs tracking-[0.08em] px-3 py-2 rounded-lg border transition-all bg-[var(--bg-el)] ${
          value
            ? accent.active
            : 'border-[var(--border-m)] text-[var(--t2)] hover:border-[var(--border-h)] hover:text-[var(--t1)]'
        }`}
      >
        <span className="truncate max-w-[120px]">{selectedLabel}</span>
        {value ? (
          <X
            size={10}
            className="flex-shrink-0 opacity-70 hover:opacity-100"
            onClick={(e) => { e.stopPropagation(); select(null) }}
          />
        ) : (
          <ChevronDown size={10} className={`flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-56 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)]">
            <Search size={11} className="text-[var(--t3)] flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${placeholder.toLowerCase()}...`}
              className="flex-1 bg-transparent font-mono text-xs text-[var(--t1)] placeholder:text-[var(--t3)] outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <X size={10} className="text-[var(--t3)] hover:text-[var(--t1)]" />
              </button>
            )}
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">
            {/* ALL option */}
            <button
              onClick={() => select(null)}
              className={`w-full text-left font-mono text-xs px-3 py-2 transition-all ${
                !value
                  ? accent.highlight
                  : 'text-[var(--t2)] hover:text-[var(--t1)] hover:bg-white/5'
              }`}
            >
              {allLabel}
            </button>

            {filtered.length === 0 ? (
              <div className="font-mono text-xs text-[var(--t3)] px-3 py-3 text-center">
                No results for &quot;{search}&quot;
              </div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => select(opt.value)}
                  className={`w-full text-left font-mono text-xs px-3 py-2 transition-all ${
                    value === opt.value
                      ? accent.highlight
                      : 'text-[var(--t2)] hover:text-[var(--t1)] hover:bg-white/5'
                  }`}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
