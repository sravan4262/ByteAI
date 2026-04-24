'use client'

import { useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Terminal } from 'lucide-react'
import { TerminalShell } from './TerminalShell'
import { useTerminal } from './useTerminal'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TerminalWidget({ open, onOpenChange }: Props) {
  const close = useCallback(() => onOpenChange(false), [onOpenChange])
  const { lines, loading, stage, handleInput, clear } = useTerminal(close)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onOpenChange])

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => onOpenChange(!open)}
        title="Open terminal (Ctrl+`)"
        className={`fixed bottom-5 right-5 z-50 w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-200
          ${open
            ? 'bg-[rgba(16,217,160,0.15)] border-[var(--green)] text-[var(--green)] shadow-[0_0_20px_rgba(16,217,160,0.45)]'
            : 'bg-[var(--bg-card)] border-[rgba(16,217,160,0.25)] text-[var(--t2)] hover:border-[var(--green)] hover:text-[var(--green)] hover:shadow-[0_0_16px_rgba(16,217,160,0.25)]'
          }`}
      >
        <Terminal size={16} />
      </button>

      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px]"
            onClick={close}
          />
        )}
      </AnimatePresence>

      {/* Terminal panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="terminal"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-20 right-5 z-50 w-[500px] h-[520px] max-w-[calc(100vw-2.5rem)]"
          >
            <TerminalShell
              lines={lines}
              loading={loading}
              stage={stage}
              onInput={handleInput}
              onClose={close}
              onClear={clear}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
