'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Keyboard, Terminal, Wand2, MessageSquare } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

interface Entry {
  trigger: string
  what: string
}

interface Section {
  title: string
  icon: typeof Keyboard
  entries: Entry[]
}

const SECTIONS: Section[] = [
  {
    title: 'KEYBOARD SHORTCUTS',
    icon: Keyboard,
    entries: [
      { trigger: 'Ctrl+`',          what: 'Open / close the support terminal' },
      { trigger: '?',               what: 'Open this cheat sheet' },
      { trigger: 'Ctrl+W',          what: 'Close the active chat tab' },
      { trigger: 'Ctrl+Shift+Esc',  what: 'Sign out from anywhere' },
      { trigger: 'Esc',             what: 'Close the open terminal' },
    ],
  },
  {
    title: 'SUPPORT TERMINAL',
    icon: Terminal,
    entries: [
      { trigger: 'help',            what: 'Show all terminal commands' },
      { trigger: 'shortcuts',       what: 'Show keyboard shortcuts' },
      { trigger: 'whoami',          what: 'Show your profile info' },
      { trigger: 'feedback --type good|bad|idea',  what: 'Submit feedback' },
      { trigger: 'report',          what: 'Report offensive content' },
      { trigger: 'history',         what: 'View your last 5 submissions' },
      { trigger: 'eastereggs',      what: 'Open this cheat sheet' },
    ],
  },
  {
    title: 'CHAT LAUNCHER',
    icon: MessageSquare,
    entries: [
      { trigger: 'inbox',           what: 'View all conversations' },
      { trigger: 'dm @username',    what: 'Open a DM thread by username' },
      { trigger: 'search "query"',  what: 'Search mutual follows' },
      { trigger: 'recent',          what: 'Show your last 5 conversations' },
      { trigger: 'TAB',             what: 'Autocomplete commands' },
      { trigger: '/shrug /lgtm /wip /brb /gtg /thanks /wave', what: 'Slash-command emotes in the message input' },
    ],
  },
  {
    title: 'INTERVIEWS — SMART MODE',
    icon: Wand2,
    entries: [
      { trigger: '@google',         what: 'Filter by company' },
      { trigger: 'role:swe',        what: 'Filter by role' },
      { trigger: 'loc:nyc',         what: 'Filter by location' },
      { trigger: '#easy / #medium / #hard', what: 'Filter by difficulty' },
      { trigger: '@stripe role:swe loc:sf #hard', what: 'Combine — order doesn’t matter' },
    ],
  },
]

export function HiddenFeaturesModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="ee-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-10"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[640px] max-h-full bg-[var(--bg-card)] border border-[rgba(167,139,250,0.35)] rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(167,139,250,0.18)] flex flex-col"
          >
            <div className="flex items-center gap-2 px-5 py-4 bg-[rgba(167,139,250,0.08)] border-b border-[rgba(167,139,250,0.25)]">
              <span className="font-mono text-[10px] text-[var(--purple)] tracking-[0.06em]">{'</>'}</span>
              <span className="font-mono text-sm font-bold text-[var(--purple)] tracking-[0.08em] flex-1">
                HIDDEN FEATURES
              </span>
              <button
                onClick={onClose}
                className="text-[var(--t2)] hover:text-[var(--t1)] transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6 scrollbar-thin scrollbar-thumb-[var(--border-m)]">
              {SECTIONS.map((section) => {
                const Icon = section.icon
                return (
                  <div key={section.title} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-[3px] h-3.5 rounded-full bg-[var(--purple)]" />
                      <Icon size={11} className="text-[var(--purple)]" />
                      <span className="font-mono text-[10px] font-bold text-[var(--t1)] tracking-[0.08em]">
                        {section.title}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      {section.entries.map((entry, i) => (
                        <div
                          key={i}
                          className="flex items-baseline gap-3 py-1.5 border-b border-[var(--border-h)] last:border-b-0"
                        >
                          <span className="font-mono text-[11px] font-semibold text-[var(--purple)] flex-shrink-0 min-w-[140px] break-words">
                            {entry.trigger}
                          </span>
                          <span className="font-mono text-[11px] text-[var(--t2)] flex-1">
                            {entry.what}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="px-5 py-3 border-t border-[var(--border-h)] bg-[var(--bg-el)] font-mono text-[10px] text-[var(--t3)] tracking-[0.04em]">
              Press <span className="text-[var(--purple)]">?</span> any time to reopen this — or type <span className="text-[var(--purple)]">eastereggs</span> in the support terminal.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
