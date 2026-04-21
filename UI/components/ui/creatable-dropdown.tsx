"use client"

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, X, Sparkles } from 'lucide-react'

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
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-2 bg-[var(--bg-el)] border rounded-lg px-3 py-2.5 text-left transition-all ${
          open ? accent : 'border-[var(--border-h)] hover:border-[var(--border-h)]'
        }`}
      >
        {value ? (
          <>
            <span className="flex-1 font-mono text-[11px] font-medium text-[var(--t1)] truncate">{value}</span>
            <X
              size={12}
              className="flex-shrink-0 text-[var(--t2)] hover:text-[var(--t1)] transition-colors"
              onClick={clear}
            />
          </>
        ) : (
          <>
            <span className="flex-1 font-mono text-[11px] text-[var(--t2)]">{placeholder}</span>
            <ChevronDown
              size={12}
              className={`flex-shrink-0 text-[var(--t2)] transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[var(--bg-card)] border border-[var(--border-h)] rounded-lg shadow-[0_8px_40px_rgba(0,0,0,0.7)] overflow-hidden">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-h)]">
            <Search size={11} className="text-[var(--t2)] flex-shrink-0" />
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
              className="flex-1 bg-transparent font-mono text-xs text-[var(--t1)] placeholder:text-[var(--t2)] outline-none"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')}>
                <X size={10} className="text-[var(--t2)] hover:text-[var(--t1)]" />
              </button>
            )}
          </div>

          <div className="max-h-52 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">
            {/* Create new option */}
            {showCreate && (
              <button
                type="button"
                onClick={() => select(search.trim())}
                className="w-full flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border-h)] text-left transition-all group bg-[rgba(167,139,250,0.04)] hover:bg-[rgba(167,139,250,0.1)]"
              >
                <div className="flex items-center justify-center w-5 h-5 rounded-md bg-[rgba(167,139,250,0.15)] border border-[rgba(167,139,250,0.3)] flex-shrink-0">
                  <Sparkles size={10} className="text-[var(--purple)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-[10px] text-[var(--t2)] block leading-none mb-0.5">use custom</span>
                  <span className="font-mono text-xs font-bold text-[var(--t1)] truncate block">&quot;{search.trim()}&quot;</span>
                </div>
                <span className="font-mono text-[8px] px-1.5 py-0.5 rounded border border-[rgba(167,139,250,0.4)] text-[var(--purple)] bg-[rgba(167,139,250,0.1)] flex-shrink-0">NEW</span>
              </button>
            )}

            {/* Existing options */}
            {filtered.length === 0 && !showCreate ? (
              <div className="font-mono text-xs text-[var(--t2)] px-3 py-4 text-center">
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
                      ? `${ACCENT[accentColor].split(' ')[2]} bg-[rgba(167,139,250,0.15)] font-bold`
                      : 'text-[var(--t1)] hover:text-[var(--t1)] hover:bg-[rgba(167,139,250,0.1)]'
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
