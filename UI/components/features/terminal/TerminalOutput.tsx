'use client'

import { useEffect, useRef } from 'react'
import type { TerminalLine } from './useTerminal'

const lineStyle: Record<string, { color: string; prefix: string }> = {
  input:   { color: 'text-[var(--t1)]',     prefix: '❯' },
  output:  { color: 'text-[var(--t1)]',     prefix: ' ' },
  error:   { color: 'text-[var(--red)]',    prefix: '✗' },
  success: { color: 'text-[var(--green)]',  prefix: '✓' },
  system:  { color: 'text-[var(--green)]',  prefix: '◆' },
}

const typeBadge: Record<string, { label: string; cls: string }> = {
  good: { label: 'GOOD', cls: 'text-[var(--green)] border-[rgba(16,217,160,0.4)] bg-[rgba(16,217,160,0.08)]' },
  bad:  { label: 'BAD',  cls: 'text-[var(--red)]   border-[rgba(255,80,80,0.4)]  bg-[rgba(255,80,80,0.08)]'  },
  idea: { label: 'IDEA', cls: 'text-[#fbbf24]       border-[rgba(251,191,36,0.4)] bg-[rgba(251,191,36,0.08)]' },
}

const statusColor: Record<string, string> = {
  open:     'text-[#fbbf24]',
  reviewed: 'text-[var(--accent)]',
  closed:   'text-[var(--green)]',
}

const ENTRY_ANIM = 'animate-[terminal-line-in_0.15s_ease-out]'

function LoadingDots() {
  return (
    <div className="flex items-center gap-1 py-0.5">
      <span className="font-mono text-[10px] text-[var(--t2)] mr-1">◆</span>
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-bounce [animation-delay:0ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-bounce [animation-delay:150ms]" />
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-bounce [animation-delay:300ms]" />
    </div>
  )
}

export function TerminalOutput({ lines, loading }: { lines: TerminalLine[]; loading: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines, loading])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 scrollbar-thin scrollbar-thumb-[var(--border-m)] scrollbar-track-transparent">
      {lines.map(line => {
        if (line.type === 'record' && line.meta) {
          const badge  = typeBadge[line.meta.feedbackType] ?? { label: line.meta.feedbackType.toUpperCase(), cls: 'text-[var(--t2)] border-[var(--border-m)]' }
          const sColor = statusColor[line.meta.status] ?? 'text-[var(--t2)]'
          return (
            <div
              key={line.id}
              className={`flex items-center gap-2 font-mono text-xs leading-relaxed py-0.5 ${ENTRY_ANIM}`}
            >
              <span className="flex-shrink-0 w-3 text-center opacity-40 mt-px"> </span>
              <span className={`px-1.5 py-px rounded text-[10px] border font-semibold tracking-wide flex-shrink-0 ${badge.cls}`}>
                {badge.label}
              </span>
              <span className="text-[var(--t1)] truncate flex-1">{line.text}</span>
              <span className={`flex-shrink-0 text-[10px] ${sColor}`}>{line.meta.status}</span>
              <span className="flex-shrink-0 text-[10px] text-[var(--t2)]">{line.meta.date}</span>
            </div>
          )
        }

        const style = lineStyle[line.type] ?? lineStyle.output
        return (
          <div
            key={line.id}
            className={`flex items-start gap-2 font-mono text-xs leading-relaxed ${style.color} ${ENTRY_ANIM}`}
          >
            <span className="flex-shrink-0 w-3 text-center opacity-60 mt-px">{style.prefix}</span>
            <span className="whitespace-pre-wrap break-all">{line.text}</span>
          </div>
        )
      })}
      {loading && <LoadingDots />}
      <div ref={bottomRef} />
    </div>
  )
}
