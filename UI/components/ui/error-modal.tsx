"use client"

import {
  XCircle,
  RefreshCw,
  X,
  Globe,
  Flame,
  EyeOff,
  AlertTriangle,
  Ban,
  Lock,
  Link2,
  Keyboard,
  Zap,
  WifiOff,
} from 'lucide-react'
import type { ComponentType } from 'react'

export interface ModerationReason {
  code: string
  message: string
}

export interface ErrorModalProps {
  errorCode: string
  title: string
  message: string
  hint?: string
  reasons?: ModerationReason[]
  onClose: () => void
  onRetry?: () => void
}

// Lucide icons share the same prop surface; keep the type loose so we don't
// import the lucide-react `LucideIcon` symbol just for this map.
type IconComponent = ComponentType<{ size?: number; className?: string }>

const REASON_ICON: Record<string, IconComponent> = {
  OFF_TOPIC: Globe,
  TOXICITY: Flame,
  HATE: Flame,
  HARASSMENT: Flame,
  SEXUAL: EyeOff,
  HARM: AlertTriangle,
  PROFANITY: Ban,
  PII: Lock,
  SPAM: Link2,
  GIBBERISH: Keyboard,
  PROMPT_INJECTION: Zap,
  MODERATION_UNAVAILABLE: WifiOff,
}

const REASON_TITLE: Record<string, string> = {
  OFF_TOPIC: 'Off-topic',
  TOXICITY: 'Toxicity',
  HATE: 'Hate speech',
  HARASSMENT: 'Harassment',
  SEXUAL: 'Sexual content',
  HARM: 'Harmful content',
  PROFANITY: 'Profanity',
  PII: 'Personal info',
  SPAM: 'Spam',
  GIBBERISH: 'Gibberish',
  PROMPT_INJECTION: 'Prompt injection',
  MODERATION_UNAVAILABLE: 'Moderation unavailable',
}

function reasonTitle(code: string): string {
  return REASON_TITLE[code] ?? code.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

export function ErrorModal({ errorCode, title, message, hint, reasons, onClose, onRetry }: ErrorModalProps) {
  const hasReasons = Array.isArray(reasons) && reasons.length > 0

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--bg-o80)] backdrop-blur-sm rounded-[inherit]">
      <div className="w-[300px] bg-[var(--bg-card)] border border-[rgba(244,63,94,0.25)] rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.7),0_0_0_1px_rgba(244,63,94,0.08)] overflow-hidden">

        {/* Top accent bar */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-[var(--red)] to-transparent opacity-60" />

        <div className="p-5 flex flex-col gap-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[rgba(244,63,94,0.12)] border border-[rgba(244,63,94,0.2)] flex items-center justify-center flex-shrink-0">
                <XCircle size={15} className="text-[var(--red)]" />
              </div>
              <div>
                <span className="font-mono text-[10px] tracking-[0.12em] text-[var(--red)] bg-[rgba(244,63,94,0.1)] border border-[rgba(244,63,94,0.18)] px-2 py-[3px] rounded-sm">
                  {errorCode}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[var(--t3)] hover:text-[var(--t1)] transition-colors mt-0.5"
            >
              <X size={13} />
            </button>
          </div>

          {/* Title */}
          <div>
            <h3 className="font-mono text-sm font-bold tracking-[0.05em] text-[var(--t1)]">
              {title}
            </h3>
            <div className="h-px bg-gradient-to-r from-[rgba(244,63,94,0.3)] to-transparent mt-2" />
          </div>

          {/* Message */}
          <p className="font-mono text-xs leading-relaxed text-[var(--t2)]">
            {message}
          </p>

          {/* Moderation reasons */}
          {hasReasons && (
            <ul className="flex flex-col gap-2">
              {reasons!.map((r, i) => {
                const Icon = REASON_ICON[r.code] ?? XCircle
                return (
                  <li
                    key={`${r.code}-${i}`}
                    className="flex items-start gap-2.5 rounded-lg border border-[rgba(244,63,94,0.18)] bg-[rgba(244,63,94,0.05)] px-3 py-2.5"
                  >
                    <div className="w-6 h-6 rounded-md bg-[rgba(244,63,94,0.12)] border border-[rgba(244,63,94,0.2)] flex items-center justify-center flex-shrink-0 mt-px">
                      <Icon size={12} className="text-[var(--red)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[10px] font-bold tracking-[0.08em] text-[var(--red)] uppercase">
                        {reasonTitle(r.code)}
                      </div>
                      <p className="font-mono text-[11px] text-[var(--t2)] leading-relaxed mt-0.5 break-words">
                        {r.message}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {/* Hint */}
          {hint && (
            <div className="rounded-lg border border-[var(--border-m)] bg-[var(--bg-el)] px-3 py-2.5">
              <p className="font-mono text-[11px] text-[var(--t3)] leading-relaxed">
                <span className="text-[var(--accent)]">// TIP</span>{'  '}{hint}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2.5 mt-1">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center justify-center gap-1.5 flex-1 py-2.5 border border-[var(--border-m)] rounded-lg font-mono text-xs font-bold tracking-[0.08em] text-[var(--t2)] transition-all hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <RefreshCw size={11} />
                RETRY
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-[var(--bg-el)] border border-[var(--border-m)] hover:border-[rgba(244,63,94,0.4)] rounded-lg font-mono text-xs font-bold tracking-[0.08em] text-[var(--t2)] hover:text-[var(--red)] transition-all"
            >
              DISMISS
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Maps an ApiError code to human-readable modal props */
export function resolveErrorModal(errorCode: string, reason?: string): Omit<ErrorModalProps, 'onClose' | 'onRetry' | 'reasons'> {
  switch (errorCode) {
    case 'CONTENT_REJECTED':
      return {
        errorCode: 'CONTENT_REJECTED',
        title: "WE COULDN'T POST THIS",
        message: 'Your content was flagged by moderation. Fix the issues below and try again.',
        hint: undefined,
      }
    case 'INVALID_CONTENT':
      return {
        errorCode: 'INVALID_CONTENT',
        title: 'NO TECH CONTENT FOUND',
        message: "We couldn't find any recognisable tech content in this byte. It may be too short, too vague, or not related to software, tools, or engineering.",
        hint: 'Try writing about a language, framework, pattern, bug you fixed, or a tool you use — even a one-liner insight counts.',
      }
    case 'DUPLICATE_CONTENT':
      return {
        errorCode: 'DUPLICATE_DETECTED',
        title: 'ALREADY EXISTS',
        message: 'A very similar byte is already in the feed.',
        hint: 'Add your own take, a different angle, or unique code example to make it stand out.',
      }
    case 'AI_QUOTA_EXHAUSTED':
      return {
        errorCode: 'AI_UNAVAILABLE',
        title: 'AI TEMPORARILY DOWN',
        message: 'Our AI content gate is overloaded right now. Please wait a moment and try again.',
      }
    default:
      return {
        errorCode: 'POST_FAILED',
        title: 'SOMETHING WENT WRONG',
        message: reason ?? 'An unexpected error occurred. Please try again.',
      }
  }
}
