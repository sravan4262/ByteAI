'use client'

import { useState, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { parseCommand, type FeedbackType } from './commandParser'
import { submitFeedback, getMyFeedbackHistory } from '@/lib/api/support'
import { getCurrentUser, getMyBytes } from '@/lib/api/client'
import { getMeCache, setMeCache } from '@/lib/user-cache'

export type LineType = 'input' | 'output' | 'error' | 'success' | 'system' | 'record'

export interface TerminalLine {
  id: number
  type: LineType
  text: string
  meta?: { feedbackType: string; status: string; date: string }
}

type Stage = 'idle' | 'awaiting-message'

let lineId = 0
const nextId = () => ++lineId

const HELP_TEXT = [
  '  help                              show this menu',
  '  whoami                            show your profile info',
  '  feedback --type good              submit positive feedback',
  '  feedback --type bad               report a bug or issue',
  '  feedback --type idea              suggest a feature',
  '  feedback --type idea "message"    one-shot submission',
  '  history                           view your last 5 submissions',
  '  clear                             clear terminal',
  '  exit  /  Ctrl+C                   close terminal',
]

export function useTerminal(onClose: () => void) {
  const pathname = usePathname()
  const pendingTypeRef = useRef<FeedbackType | null>(null)

  const [lines, setLines] = useState<TerminalLine[]>([
    { id: nextId(), type: 'system', text: 'ByteAI Terminal v1.0 — type help to get started.' },
  ])
  const [stage, setStage]     = useState<Stage>('idle')
  const [loading, setLoading] = useState(false)

  const push = useCallback((type: LineType, text: string, meta?: TerminalLine['meta']) => {
    setLines(prev => [...prev, { id: nextId(), type, text, meta }])
  }, [])

  const clear = useCallback(() => {
    setLines([{ id: nextId(), type: 'system', text: 'ByteAI Terminal v1.0 — type help to get started.' }])
    setStage('idle')
    pendingTypeRef.current = null
  }, [])

  const handleInput = useCallback(async (raw: string) => {
    const trimmedLower = raw.trim().toLowerCase()

    if (trimmedLower === 'clear') { clear(); return }
    if (trimmedLower === 'exit') { onClose(); return }
    if (!raw.trim()) return

    push('input', `> ${raw}`)

    // ── Awaiting free-text message after "feedback --type X" ──────────────
    if (stage === 'awaiting-message') {
      const message = raw.trim()
      const type    = pendingTypeRef.current!

      if (message.length < 5) {
        push('error', '[!] Message too short — at least 5 characters.')
        return
      }

      setLoading(true)
      const result = await submitFeedback({ type, message, pageContext: pathname })
      setLoading(false)

      if (result) {
        push('success', `[✓] Feedback submitted (${type}). Thank you!`)
      } else {
        push('error', '[!] Submission failed. Please try again.')
      }

      setStage('idle')
      pendingTypeRef.current = null
      return
    }

    // ── Parse as command ───────────────────────────────────────────────────
    const parsed = parseCommand(raw)

    switch (parsed.cmd) {
      case 'help':
        push('output', 'Commands:')
        HELP_TEXT.forEach(line => push('output', line))
        break

      case 'whoami': {
        setLoading(true)
        const [user, myBytes] = await Promise.all([getCurrentUser(), getMyBytes({ pageSize: 1 })])
        setLoading(false)
        if (!user) {
          push('error', '[!] Not signed in.')
          break
        }
        const cached = getMeCache()
        setMeCache({
          userId: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl ?? cached?.avatarUrl ?? null,
          bio: user.bio,
          roleTitle: user.roleTitle,
          company: user.company,
          level: user.level,
          bytesCount: myBytes.total,
          followersCount: user.followersCount ?? 0,
          followingCount: user.followingCount ?? 0,
          isVerified: user.isVerified,
        })
        push('output', '─────────────────────────────')
        push('output', `  username    ${user.username}`)
        push('output', `  display     ${user.displayName}`)
        push('output', `  level       ${user.level}`)
        push('output', `  bytes       ${myBytes.total}`)
        push('output', `  followers   ${user.followersCount ?? 0}`)
        push('output', `  following   ${user.followingCount ?? 0}`)
        if (user.roleTitle) push('output', `  role        ${user.roleTitle}`)
        if (user.company)   push('output', `  company     ${user.company}`)
        push('output', '─────────────────────────────')
        break
      }

      case 'history': {
        setLoading(true)
        const history = await getMyFeedbackHistory()
        setLoading(false)
        if (history.length === 0) {
          push('output', 'No feedback submitted yet.')
        } else {
          push('output', 'Your last submissions:')
          history.forEach(f => {
            const date    = new Date(f.createdAt).toLocaleDateString()
            const preview = f.message.slice(0, 55) + (f.message.length > 55 ? '…' : '')
            push('record', preview, { feedbackType: f.type, status: f.status, date })
          })
        }
        break
      }

      case 'feedback': {
        const label =
          parsed.feedbackType === 'good' ? 'positive feedback' :
          parsed.feedbackType === 'bad'  ? 'issue or bug' :
          'feature idea'

        if (parsed.inlineMessage) {
          // One-shot: submit without entering awaiting-message stage
          if (parsed.inlineMessage.length < 5) {
            push('error', '[!] Message too short — at least 5 characters.')
            break
          }
          setLoading(true)
          const result = await submitFeedback({ type: parsed.feedbackType, message: parsed.inlineMessage, pageContext: pathname })
          setLoading(false)
          if (result) {
            push('success', `[✓] Feedback submitted (${parsed.feedbackType}). Thank you!`)
          } else {
            push('error', '[!] Submission failed. Please try again.')
          }
        } else {
          pendingTypeRef.current = parsed.feedbackType
          setStage('awaiting-message')
          push('output', `[?] Tell us your ${label} (5–1000 chars):`)
        }
        break
      }

      case 'error':
        push('error', `[!] ${parsed.message}`)
        break

      case 'unknown':
        push('error', `[!] Unknown command: "${parsed.raw}". Type help for available commands.`)
        break
    }
  }, [stage, pathname, push, clear, onClose])

  return { lines, loading, stage, handleInput, clear }
}
