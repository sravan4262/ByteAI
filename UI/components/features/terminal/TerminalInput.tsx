'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

const COMPLETIONS = [
  'help',
  'whoami',
  'feedback --type good',
  'feedback --type bad',
  'feedback --type idea',
  'history',
  'clear',
  'exit',
]

const MAX_MESSAGE = 1000

interface Props {
  onSubmit: (value: string) => void
  disabled: boolean
  stage: 'idle' | 'awaiting-message'
  completions?: string[]
}

export function TerminalInput({ onSubmit, disabled, stage, completions: completionsProp }: Props) {
  const completions = completionsProp ?? COMPLETIONS
  const [value, setValue]        = useState('')
  const [historyIdx, setHistIdx] = useState(-1)
  const historyRef               = useRef<string[]>([])
  const inputRef                 = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!disabled) inputRef.current?.focus()
  }, [disabled])

  const submit = useCallback((val: string) => {
    const trimmed = val.trim()
    if (trimmed && historyRef.current[0] !== trimmed) {
      historyRef.current = [trimmed, ...historyRef.current.slice(0, 49)]
    }
    setHistIdx(-1)
    onSubmit(val)
    setValue('')
  }, [onSubmit])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !disabled) {
      submit(value)
      return
    }

    if (e.key === 'c' && e.ctrlKey) {
      submit('exit')
      return
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      const lower = value.toLowerCase()
      const match = completions.find(c => c.startsWith(lower) && c !== lower)
      if (match) setValue(match)
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.min(historyIdx + 1, historyRef.current.length - 1)
      setHistIdx(next)
      setValue(historyRef.current[next] ?? '')
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = historyIdx - 1
      if (next < 0) {
        setHistIdx(-1)
        setValue('')
      } else {
        setHistIdx(next)
        setValue(historyRef.current[next] ?? '')
      }
    }
  }

  const isInput   = stage === 'awaiting-message'
  const charCount = value.length
  const overLimit = charCount > MAX_MESSAGE
  const nearLimit = charCount > MAX_MESSAGE * 0.8

  const counterColor = overLimit
    ? 'text-[var(--red)]'
    : nearLimit
      ? 'text-[#fbbf24]'
      : 'text-[var(--t3)]'

  return (
    <div className="border-t border-[var(--border-h)] bg-[rgba(16,217,160,0.02)]">
      <div className="flex items-center gap-0 px-4 py-3">
        <div className="flex items-center gap-1.5 flex-shrink-0 select-none mr-1.5">
          {isInput ? (
            <span className="font-mono text-xs text-[#fbbf24]">input</span>
          ) : (
            <>
              <span className="font-mono text-xs text-[rgba(16,217,160,0.7)]">byteai</span>
              <span className="font-mono text-xs text-[var(--t2)]">@</span>
              <span className="font-mono text-xs text-[var(--accent)]">~</span>
            </>
          )}
          <span className="font-mono text-xs text-[var(--green)] font-bold">
            {isInput ? '›' : '$'}
          </span>
        </div>

        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="flex-1 bg-transparent font-mono text-xs text-[var(--t1)] outline-none caret-[var(--green)] placeholder:text-[var(--t2)] disabled:opacity-40"
          placeholder={disabled ? '' : isInput ? 'Type your message...' : 'type a command...'}
        />

        {isInput && (
          <span className={`font-mono text-[10px] flex-shrink-0 ml-2 tabular-nums ${counterColor}`}>
            {charCount}/{MAX_MESSAGE}
          </span>
        )}

        <span className="w-1.5 h-4 bg-[var(--green)] animate-[pulse_1s_ease-in-out_infinite] rounded-[1px] flex-shrink-0 opacity-80 ml-1" />
      </div>

      {value.length > 0 && (() => {
        const lower = value.toLowerCase()
        const match = completions.find(c => c.startsWith(lower) && c !== lower)
        if (!match) return null
        return (
          <div className="px-4 pb-2 flex items-center gap-1.5">
            <span className="font-mono text-[10px] text-[var(--t2)] tracking-wide font-bold">TAB</span>
            <span className="font-mono text-[10px] text-[var(--green)] opacity-70">{match}</span>
          </div>
        )
      })()}
    </div>
  )
}
