"use client"

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, X, Check, Sparkles } from 'lucide-react'

export interface DropdownOption {
  value: string
  label: string
}

interface MultiSelectDropdownProps {
  options: DropdownOption[]
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  className?: string
  accentColor?: 'accent' | 'cyan' | 'green' | 'purple'
  maxDisplay?: number
  creatable?: boolean
}

const ACCENT_CLASSES = {
  accent: {
    active: 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-d)]',
    badge: 'bg-[var(--accent-d)] text-[var(--accent)] border-[var(--accent)]',
    check: 'text-[var(--accent)]',
    row: 'text-[var(--accent)] bg-[var(--accent-d)]',
  },
  cyan: {
    active: 'border-[var(--cyan)] text-[var(--cyan)] bg-[var(--cyan-d)]',
    badge: 'bg-[var(--cyan-d)] text-[var(--cyan)] border-[var(--cyan)]',
    check: 'text-[var(--cyan)]',
    row: 'text-[var(--cyan)] bg-[var(--cyan-d)]',
  },
  green: {
    active: 'border-[var(--green)] text-[var(--green)] bg-[var(--green-d)]',
    badge: 'bg-[var(--green-d)] text-[var(--green)] border-[var(--green)]',
    check: 'text-[var(--green)]',
    row: 'text-[var(--green)] bg-[var(--green-d)]',
  },
  purple: {
    active: 'border-[var(--purple)] text-[var(--purple)] bg-[var(--purple-d)]',
    badge: 'bg-[var(--purple-d)] text-[var(--purple)] border-[var(--purple)]',
    check: 'text-[var(--purple)]',
    row: 'text-[var(--purple)] bg-[var(--purple-d)]',
  },
}

export function MultiSelectDropdown({
  options,
  values,
  onChange,
  placeholder = 'SELECT',
  className = '',
  accentColor = 'accent',
  maxDisplay = 2,
  creatable = false,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const accent = ACCENT_CLASSES[accentColor]

  const filtered = options
    .filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.label.localeCompare(b.label))

  const trimmedSearch = search.trim()
  const exactMatch =
    trimmedSearch.length > 0 &&
    (options.some((o) => o.label.toLowerCase() === trimmedSearch.toLowerCase()) ||
      values.some((v) => v.toLowerCase() === trimmedSearch.toLowerCase()))
  const showCreate = creatable && trimmedSearch.length > 0 && !exactMatch

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const toggle = (val: string) => {
    if (values.includes(val)) {
      onChange(values.filter((v) => v !== val))
    } else {
      onChange([...values, val])
    }
  }

  const createAndSelect = () => {
    if (!trimmedSearch) return
    if (!values.some((v) => v.toLowerCase() === trimmedSearch.toLowerCase())) {
      onChange([...values, trimmedSearch])
    }
    setSearch('')
  }

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])
  }

  const displayLabel = () => {
    if (values.length === 0) return placeholder
    if (values.length <= maxDisplay) return values.join(', ')
    return `${values.slice(0, maxDisplay).join(', ')} +${values.length - maxDisplay}`
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 font-mono text-xs tracking-[0.08em] px-3 py-2 rounded-lg border transition-all bg-[var(--bg-el)] ${
          values.length > 0
            ? accent.active
            : 'border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] text-[var(--t1)] hover:border-[rgba(59,130,246,0.45)] hover:bg-[rgba(59,130,246,0.07)] hover:text-[var(--accent)]'
        }`}
      >
        <span className="truncate max-w-[160px]">{displayLabel()}</span>
        {values.length > 0 ? (
          <X
            size={10}
            className="flex-shrink-0 opacity-70 hover:opacity-100"
            onClick={clearAll}
          />
        ) : (
          <ChevronDown size={10} className={`flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 w-64 bg-[var(--bg-card)] border border-[var(--border-h)] rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border-h)]">
            <Search size={11} className="text-[var(--t2)] flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && showCreate) {
                  e.preventDefault()
                  createAndSelect()
                }
              }}
              placeholder={creatable ? 'Search or type to create...' : `Search ${placeholder.toLowerCase()}...`}
              className="flex-1 bg-transparent font-mono text-xs text-[var(--t1)] placeholder:text-[var(--t2)] outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <X size={10} className="text-[var(--t2)] hover:text-[var(--t1)]" />
              </button>
            )}
          </div>

          {/* Selected count */}
          {values.length > 0 && (
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border-h)] bg-[rgba(59,130,246,0.03)]">
              <span className={`font-mono text-[10px] ${accent.check}`}>{values.length} selected</span>
              <button onClick={clearAll} className="font-mono text-[10px] text-[var(--t2)] hover:text-[var(--red)]">
                CLEAR ALL
              </button>
            </div>
          )}

          {/* Options */}
          <div className="max-h-52 overflow-y-auto scrollbar-thin scrollbar-thumb-[var(--border-m)]">
            {showCreate && (
              <button
                type="button"
                onClick={createAndSelect}
                className="w-full flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border-h)] text-left transition-all bg-[rgba(59,130,246,0.04)] hover:bg-[rgba(59,130,246,0.1)]"
              >
                <div className="flex items-center justify-center w-5 h-5 rounded-md bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.3)] flex-shrink-0">
                  <Sparkles size={10} className="text-[var(--accent)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-[10px] text-[var(--t2)] block leading-none mb-0.5">use custom</span>
                  <span className="font-mono text-xs font-bold text-[var(--t1)] truncate block">&quot;{trimmedSearch}&quot;</span>
                </div>
                <span className="font-mono text-[8px] px-1.5 py-0.5 rounded border border-[rgba(59,130,246,0.4)] text-[var(--accent)] bg-[rgba(59,130,246,0.1)] flex-shrink-0">NEW</span>
              </button>
            )}
            {filtered.length === 0 && !showCreate ? (
              <div className="font-mono text-[10px] text-[var(--t2)] px-3 py-3 text-center">
                No results for &quot;{search}&quot;
              </div>
            ) : (
              filtered.map((opt) => {
                const isSelected = values.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggle(opt.value)}
                    className={`w-full text-left font-mono text-xs px-3 py-2 transition-all flex items-center justify-between ${
                      isSelected
                        ? accent.row
                        : 'text-[var(--t1)] hover:bg-[rgba(59,130,246,0.07)] hover:text-[var(--accent)]'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check size={10} className={accent.check} />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
