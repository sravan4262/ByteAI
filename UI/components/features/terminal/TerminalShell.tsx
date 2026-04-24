'use client'

import { X, Minus, Terminal } from 'lucide-react'
import { TerminalOutput } from './TerminalOutput'
import { TerminalInput } from './TerminalInput'
import type { TerminalLine } from './useTerminal'

interface Props {
  lines: TerminalLine[]
  loading: boolean
  stage: 'idle' | 'awaiting-message'
  onInput: (value: string) => void
  onClose: () => void
  onClear: () => void
}

export function TerminalShell({ lines, loading, stage, onInput, onClose, onClear }: Props) {
  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden border border-[rgba(16,217,160,0.3)] bg-[var(--bg-card)] shadow-[0_24px_80px_rgba(0,0,0,0.85),0_0_0_1px_rgba(16,217,160,0.08),0_0_60px_rgba(16,217,160,0.05)]">

      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(16,217,160,0.15)] bg-[rgba(16,217,160,0.03)] select-none">

        {/* Traffic lights */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onClose}
            title="Close"
            className="group w-3 h-3 rounded-full bg-[#ff5f57] border border-[rgba(0,0,0,0.15)] flex items-center justify-center hover:brightness-90 transition-all"
          >
            <X size={6} className="text-[rgba(0,0,0,0.5)] opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <button
            onClick={onClear}
            title="Clear"
            className="group w-3 h-3 rounded-full bg-[#febc2e] border border-[rgba(0,0,0,0.15)] flex items-center justify-center hover:brightness-90 transition-all"
          >
            <Minus size={6} className="text-[rgba(0,0,0,0.5)] opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <div className="w-3 h-3 rounded-full bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.08)]" />
        </div>

        {/* Title */}
        <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
          <div className="w-4 h-4 rounded-sm bg-[rgba(16,217,160,0.1)] border border-[rgba(16,217,160,0.2)] flex items-center justify-center">
            <Terminal size={9} className="text-[var(--green)]" />
          </div>
          <span className="font-mono text-[10px] font-semibold text-[var(--t1)] tracking-[0.12em]">
            BYTEAI_TERMINAL
          </span>
          <span className="font-mono text-[10px] text-[var(--t3)]">v1.0</span>
        </div>

        {/* Stage badge */}
        <div className="flex items-center">
          {stage === 'awaiting-message' ? (
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[rgba(251,191,36,0.12)] border border-[rgba(251,191,36,0.25)] text-[#fbbf24] tracking-wide">
              INPUT
            </span>
          ) : (
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[rgba(16,217,160,0.08)] border border-[rgba(16,217,160,0.2)] text-[var(--green)] tracking-wide">
              READY
            </span>
          )}
        </div>
      </div>

      {/* Accent line */}
      <div className="h-px bg-gradient-to-r from-[var(--green)] via-[rgba(16,217,160,0.25)] to-transparent" />

      {/* Output + Input */}
      <TerminalOutput lines={lines} loading={loading} />
      <TerminalInput onSubmit={onInput} disabled={loading} stage={stage} />
    </div>
  )
}
