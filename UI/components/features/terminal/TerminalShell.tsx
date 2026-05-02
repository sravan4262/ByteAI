'use client'

import { X, Minus, Maximize2, LifeBuoy } from 'lucide-react'
import { TerminalOutput } from './TerminalOutput'
import { TerminalInput } from './TerminalInput'
import type { TerminalLine } from './useTerminal'

interface Props {
  lines: TerminalLine[]
  loading: boolean
  stage: 'idle' | 'awaiting-message' | 'awaiting-report-type' | 'awaiting-report-id' | 'awaiting-report-message'
  onInput: (value: string) => void
  onClose: () => void
  onClear: () => void
  /** When provided, the green traffic light becomes a maximize toggle. */
  onMaximize?: () => void
  /** Reflects current maximized state for the green button styling. */
  isMaximized?: boolean
}

export function TerminalShell({
  lines,
  loading,
  stage,
  onInput,
  onClose,
  onClear,
  onMaximize,
  isMaximized,
}: Props) {
  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden border border-[rgba(16,217,160,0.3)] bg-[var(--bg-card)] shadow-[0_24px_80px_rgba(0,0,0,0.85),0_0_0_1px_rgba(16,217,160,0.08),0_0_60px_rgba(16,217,160,0.05)]">

      {/* Accent line */}
      <div className="h-px bg-gradient-to-r from-[var(--green)] via-[rgba(16,217,160,0.25)] to-transparent flex-shrink-0" />

      {/* Title bar */}
      <div className="relative flex items-center justify-between px-4 py-3 border-b border-[rgba(16,217,160,0.15)] bg-[rgba(16,217,160,0.03)] select-none">

        {/* Traffic lights */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onClose}
            title="Close"
            className="w-3.5 h-3.5 rounded-full bg-[#ff5f57] border border-[rgba(0,0,0,0.15)] flex items-center justify-center hover:brightness-90 transition-all"
          >
            <X size={7} className="text-[rgba(0,0,0,0.65)]" />
          </button>
          <button
            onClick={onClear}
            title="Clear"
            className="w-3.5 h-3.5 rounded-full bg-[#febc2e] border border-[rgba(0,0,0,0.15)] flex items-center justify-center hover:brightness-90 transition-all"
          >
            <Minus size={7} className="text-[rgba(0,0,0,0.65)]" />
          </button>
          {onMaximize ? (
            <button
              onClick={onMaximize}
              title={isMaximized ? 'Restore' : 'Maximize'}
              className="w-3.5 h-3.5 rounded-full bg-[#28c940] border border-[rgba(0,0,0,0.15)] flex items-center justify-center hover:brightness-90 transition-all"
            >
              <Maximize2 size={7} className="text-[rgba(0,0,0,0.65)]" />
            </button>
          ) : (
            <div className="w-3.5 h-3.5 rounded-full bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.08)]" />
          )}
        </div>

        {/* Title */}
        <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
          <div className="w-4 h-4 rounded-sm bg-[rgba(16,217,160,0.1)] border border-[rgba(16,217,160,0.2)] flex items-center justify-center">
            <LifeBuoy size={10} className="text-[var(--green)]" />
          </div>
          <span className="font-mono text-[11px] font-semibold text-[var(--t1)] tracking-[0.12em]">
            SUPPORT
          </span>
          <span className="font-mono text-[10px] text-[var(--t2)]">v1.0</span>
        </div>

        {/* Stage badge */}
        <div className="flex items-center">
          {stage === 'idle' ? (
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[rgba(16,217,160,0.08)] border border-[rgba(16,217,160,0.2)] text-[var(--green)] tracking-wide font-bold">
              READY
            </span>
          ) : stage === 'awaiting-message' ? (
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[rgba(251,191,36,0.12)] border border-[rgba(251,191,36,0.25)] text-[#fbbf24] tracking-wide font-bold">
              INPUT
            </span>
          ) : (
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[rgba(251,191,36,0.12)] border border-[rgba(251,191,36,0.25)] text-[#fbbf24] tracking-wide font-bold">
              REPORT
            </span>
          )}
        </div>
      </div>

      {/* Output + Input */}
      <TerminalOutput lines={lines} loading={loading} />
      <TerminalInput onSubmit={onInput} disabled={loading} stage={stage} />
    </div>
  )
}
