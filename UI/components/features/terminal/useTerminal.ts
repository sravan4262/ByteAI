'use client'

import { useState, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { parseCommand, type FeedbackType } from './commandParser'
import { submitFeedback, getMyFeedbackHistory, reportContent } from '@/lib/api/support'
import { getCurrentUser, getMyBytes } from '@/lib/api/client'
import { ApiError } from '@/lib/api/http'
import { getMeCache, setMeCache } from '@/lib/user-cache'

export type LineType = 'input' | 'output' | 'error' | 'success' | 'system' | 'record'

export interface TerminalLine {
  id: number
  type: LineType
  text: string
  meta?: { feedbackType: string; status: string; date: string }
}

type Stage = 'idle' | 'awaiting-message' | 'awaiting-report-type' | 'awaiting-report-id' | 'awaiting-report-message'

const REPORT_CONTENT_TYPES = ['byte', 'comment', 'interview', 'chat']

function inferContentFromPath(pathname: string): { contentType: string; contentId: string } | null {
  const m = /^\/(byte|interview)\/([0-9a-f-]{36})/i.exec(pathname)
  if (!m) return null
  return { contentType: m[1].toLowerCase(), contentId: m[2] }
}

let lineId = 0
const nextId = () => ++lineId

const HELP_TEXT = [
  '  help                              show this menu',
  '  whoami                            show your profile info',
  '  feedback --type good              submit positive feedback',
  '  feedback --type bad               report a bug or issue',
  '  feedback --type idea              suggest a feature',
  '  feedback --type idea "message"    one-shot submission',
  '  report                            report offensive content',
  '  history                           view your last 5 submissions',
  '  clear                             clear terminal',
  '  exit  /  Ctrl+C                   close terminal',
]

export function useTerminal(onClose: () => void) {
  const pathname = usePathname()
  const pendingTypeRef       = useRef<FeedbackType | null>(null)
  const pendingReportTypeRef = useRef<string | null>(null)
  const pendingReportIdRef   = useRef<string | null>(null)

  const [lines, setLines] = useState<TerminalLine[]>([
    { id: nextId(), type: 'system', text: 'ByteAI Terminal v1.0 — type help to get started.' },
  ])
  const [stage, setStage]     = useState<Stage>('idle')
  const [loading, setLoading] = useState(false)

  const push = useCallback((type: LineType, text: string, meta?: TerminalLine['meta']) => {
    setLines(prev => [...prev, { id: nextId(), type, text, meta }])
  }, [])

  /**
   * Submits feedback and pushes terminal lines for the result. Returns true
   * on success so callers can decide whether to advance UI state.
   */
  const submitAndRender = useCallback(async (
    type: FeedbackType,
    message: string,
    pageContext: string,
  ): Promise<boolean> => {
    try {
      const result = await submitFeedback({ type, message, pageContext })
      if (result) {
        push('success', `[✓] Feedback submitted (${type}). Thank you!`)
        return true
      }
      push('error', '[!] Submission failed. Please try again.')
      return false
    } catch (err) {
      if (err instanceof ApiError && err.errorCode === 'CONTENT_REJECTED' && err.reasons?.length) {
        for (const r of err.reasons) {
          push('error', `> ERROR: ${r.code} — ${r.message}`)
        }
      } else {
        push('error', '[!] Submission failed. Please try again.')
      }
      return false
    }
  }, [push])

  const clear = useCallback(() => {
    setLines([{ id: nextId(), type: 'system', text: 'ByteAI Terminal v1.0 — type help to get started.' }])
    setStage('idle')
    pendingTypeRef.current       = null
    pendingReportTypeRef.current = null
    pendingReportIdRef.current   = null
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
      await submitAndRender(type, message, pathname)
      setLoading(false)

      setStage('idle')
      pendingTypeRef.current = null
      return
    }

    // ── Report multi-step flow ─────────────────────────────────────────────
    if (stage === 'awaiting-report-type') {
      const t = raw.trim().toLowerCase()
      if (!REPORT_CONTENT_TYPES.includes(t)) {
        push('error', `[!] Unknown type "${t}". Use: byte, comment, interview, chat`)
        return
      }
      pendingReportTypeRef.current = t
      setStage('awaiting-report-id')
      push('output', '[?] Paste the content ID (UUID from the URL):')
      return
    }

    if (stage === 'awaiting-report-id') {
      const id = raw.trim()
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRe.test(id)) {
        push('error', '[!] That doesn\'t look like a valid ID. Copy it from the post URL.')
        return
      }
      pendingReportIdRef.current = id
      setStage('awaiting-report-message')
      push('output', '[?] Describe the issue (optional — press Enter to skip):')
      return
    }

    if (stage === 'awaiting-report-message') {
      const contentType = pendingReportTypeRef.current!
      const contentId   = pendingReportIdRef.current!
      const message     = raw.trim() || undefined

      setLoading(true)
      const result = await reportContent({ contentType, contentId, reasonCode: 'USER_REPORT', message })
      setLoading(false)

      if (result) {
        push('success', '[✓] Report submitted. Our team will review it.')
      } else {
        push('error', '[!] Report failed. Please try again.')
      }

      setStage('idle')
      pendingReportTypeRef.current = null
      pendingReportIdRef.current   = null
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
          await submitAndRender(parsed.feedbackType, parsed.inlineMessage, pathname)
          setLoading(false)
        } else {
          pendingTypeRef.current = parsed.feedbackType
          setStage('awaiting-message')
          push('output', `[?] Tell us your ${label} (5–1000 chars):`)
        }
        break
      }

      case 'report': {
        const inferred = inferContentFromPath(pathname)
        if (inferred) {
          pendingReportTypeRef.current = inferred.contentType
          pendingReportIdRef.current   = inferred.contentId
          setStage('awaiting-report-message')
          push('output', `[→] Reporting ${inferred.contentType} ${inferred.contentId}`)
          push('output', '[?] Describe the issue (optional — press Enter to skip):')
        } else {
          setStage('awaiting-report-type')
          push('output', '[?] What type of content? (byte / comment / interview / chat):')
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
  }, [stage, pathname, push, clear, onClose, submitAndRender])

  return { lines, loading, stage, handleInput, clear }
}
