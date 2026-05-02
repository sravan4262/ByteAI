'use client'

import { useEffect, useState } from 'react'
import { HiddenFeaturesModal } from './HiddenFeaturesModal'

const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']

const isTypingTarget = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  return false
}

/**
 * Mounts the Hidden Features cheat-sheet modal and wires up its triggers:
 *   - Pressing `?` (Shift+/) anywhere outside an input field
 *   - The Konami code (↑↑↓↓←→←→BA)
 *   - A window event `byteai:open-eastereggs` (used by the support terminal)
 */
export function HiddenFeaturesProvider() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let buffer: string[] = []

    const onKey = (e: KeyboardEvent) => {
      // Custom event channel
      if (e.key === '?' && !isTypingTarget(e.target)) {
        e.preventDefault()
        setOpen(v => !v)
        return
      }

      // Konami buffer — match raw key (case-sensitive on B/A handled below)
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      buffer = [...buffer, k].slice(-KONAMI.length)
      if (buffer.length === KONAMI.length && buffer.every((v, i) => v === KONAMI[i])) {
        buffer = []
        setOpen(true)
      }
    }

    const onCustom = () => setOpen(true)

    window.addEventListener('keydown', onKey)
    window.addEventListener('byteai:open-eastereggs', onCustom)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('byteai:open-eastereggs', onCustom)
    }
  }, [])

  return <HiddenFeaturesModal open={open} onClose={() => setOpen(false)} />
}
