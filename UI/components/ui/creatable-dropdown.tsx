"use client"

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, X, Plus } from 'lucide-react'

interface CreatableDropdownProps {
  options: string[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  accentColor?: 'accent' | 'purple' | 'green' | 'cyan'
}

const ACCENT = {
  accent: 'border-[var(--accent)] focus-within:border-[var(--accent)] text-[var(--accent)]',
  purple: 'border-[var(--purple)] focus-within:border-[var(--purple)] text-[var(--purple)]',
  green:  'border-[var(--green)]  focus-within:border-[var(--green)]  text-[var(--green)]',
  cyan:   'border-[var(--cyan)]   focus-within:border-[var(--cyan)]   text-[var(--cyan)]',
}

export function CreatableDropdown({
  options,
  value,
  onChange,
  placeholder = 'Search or create...',
  accentColor = 'purple',
}: CreatableDropdownProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const accent = ACCENT[accentColor]

  const filtered = options
    .filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.localeCompare(b))

  const exactMatch = options.some((o) => o.toLowerCase() === search.toLowerCase())
  const showCreate = search.trim().length > 0 && !exactMatch

  // Close on outside click / ESC
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

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const select = (val: string) => {
    onChange(val)
    setOpen(false)
    setSearch('')
  }

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setSearch('')
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger — looks like a text input */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-2 bg-[var(--bg-el)] border rounded-lg px-3 py-2.5 text-left transition-all ${
          open ? accent : 'border-[var(--border-m)] hover:border-[var(--border-h)]'
        }`}
      >
        {value ? (
          <>
            <span className="flex-1 font-mono text-[11px] text-[var(--t1)] truncate">{value}</span>
            <X
              size={12}
              className="flex-shrink-0 text-[var(--t3)] hover:text-[var(--t1)] transition-colors"
              onClick={clear}
            />
          </>
        ) : (
          <>
            <span className="flex-1 font-mono text-[11px] text-[var(--t3)]">{placeholder}</span>
            <ChevronDown
              size={12}
              className={`flex-shrink-0 text-[var(--t3)] transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-[0_8px_40px_rgba(0,0,0,0.7)] overflow-hidden">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)]">
            <Search size={11} className="text-[var(--t3)] flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search.trim()) {
                  select(search.trim())
                }
              }}
              placeholder="Search or type to create..."
              className="flex-1 bg-transparent font-mono text-xs text-[var(--t1)] placeholder:text-[var(--t3)] outline-none"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')}>
                <X size={10} className="text-[var(--t3)] hover:text-[var(--t1)]" />
              </button>
            )}
          </div>

          <div className="max-h-52 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">
            {/* Create new option */}
            {showCreate && (
              <button
                type="button"
                onClick={() => select(search.trim())}
                className="w-full flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border)] text-left transition-all hover:bg-white/5 group"
              >
                <Plus size={11} className={`flex-shrink-0 ${ACCENT[accentColor].split(' ')[2]}`} />
                <span className="font-mono text-xs text-[var(--t2)] group-hover:text-[var(--t1)]">
                  Create <span className="font-bold text-[var(--t1)]">&quot;{search.trim()}&quot;</span>
                </span>
              </button>
            )}

            {/* Existing options */}
            {filtered.length === 0 && !showCreate ? (
              <div className="font-mono text-xs text-[var(--t3)] px-3 py-4 text-center">
                No results — type to create a new one
              </div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => select(opt)}
                  className={`w-full text-left font-mono text-xs px-3 py-2 transition-all ${
                    value === opt
                      ? `${ACCENT[accentColor].split(' ')[2]} bg-white/5`
                      : 'text-[var(--t2)] hover:text-[var(--t1)] hover:bg-white/5'
                  }`}
                >
                  {opt}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
