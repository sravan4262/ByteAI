'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Lightbulb, X } from 'lucide-react'

const TIPS: { text: string; highlight: string }[] = [
  { text: 'opens the support terminal',         highlight: 'Ctrl+`' },
  { text: 'opens this hidden-features menu',    highlight: '?' },
  { text: 'in Smart Mode filters interviews',   highlight: '@google role:swe #hard' },
  { text: 'signs you out from anywhere',        highlight: 'Ctrl+Shift+Esc' },
  { text: 'in a chat input expands to ¯\\_(ツ)_/¯', highlight: '/shrug' },
  { text: 'closes the active chat tab',         highlight: 'Ctrl+W' },
  { text: 'in chat opens a DM with that user',  highlight: 'dm @username' },
  { text: 'in the support terminal lists every command', highlight: 'help' },
]

const ROTATE_MS = 12_000
const DISMISS_KEY = 'byteai.tipstrip.dismissed'

export function TipStrip() {
  const [index, setIndex] = useState(0)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    setDismissed(typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY) === '1')
  }, [])

  useEffect(() => {
    if (dismissed) return
    const id = setInterval(() => setIndex(i => (i + 1) % TIPS.length), ROTATE_MS)
    return () => clearInterval(id)
  }, [dismissed])

  if (dismissed) return null
  const tip = TIPS[index]

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 mx-2 mt-1 rounded-lg border border-[rgba(167,139,250,0.18)] bg-[rgba(167,139,250,0.04)]">
      <Lightbulb size={11} className="text-[var(--purple)] flex-shrink-0" />
      <span className="font-mono text-[10px] text-[var(--t3)] tracking-[0.04em]">TIP</span>
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
          className="flex-1 min-w-0 truncate font-mono text-[11px] text-[var(--t2)]"
        >
          <span className="text-[var(--purple)] font-semibold">{tip.highlight}</span>{' '}
          <span>{tip.text}</span>
        </motion.div>
      </AnimatePresence>
      <button
        onClick={dismiss}
        aria-label="Dismiss tip"
        className="text-[var(--t3)] hover:text-[var(--t2)] transition-colors flex-shrink-0"
      >
        <X size={11} />
      </button>
    </div>
  )
}
