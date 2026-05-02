'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { X, Minus, Terminal, AlertTriangle } from 'lucide-react'
import { useMessages } from '@/hooks/use-messages'
import { useChatConnection, type IncomingMessage } from '@/hooks/use-chat-connection'
import { ChatMessage } from './ChatMessage'
import { TerminalInput } from '@/components/features/terminal/TerminalInput'
import type { MessageDto } from '@/lib/api/chat'
import type { ModerationReason } from '@/lib/api/http'

/**
 * SignalR HubExceptions surface as `Error` objects whose message is the raw
 * server-side string. The chat hub serialises moderation rejections as a
 * JSON payload matching the REST `CONTENT_REJECTED` shape, so we sniff the
 * message for that JSON and pull out the structured reasons.
 */
function parseModerationReasons(err: unknown): ModerationReason[] | null {
  if (!(err instanceof Error)) return null
  const msg = err.message
  const start = msg.indexOf('{')
  if (start < 0) return null
  try {
    const body = JSON.parse(msg.slice(start))
    if (body?.error !== 'CONTENT_REJECTED' || !Array.isArray(body?.reasons)) return null
    const reasons: ModerationReason[] = body.reasons.filter(
      (r: unknown): r is ModerationReason =>
        typeof r === 'object' && r !== null &&
        typeof (r as { code?: unknown }).code === 'string' &&
        typeof (r as { message?: unknown }).message === 'string',
    )
    return reasons.length > 0 ? reasons : null
  } catch {
    return null
  }
}

interface Props {
  conversationId: string
  otherUsername: string
  otherUserId: string
  currentUserId: string
}

export function ChatThread({ conversationId, otherUsername, otherUserId, currentUserId }: Props) {
  const { messages, loading, hasMore, loadMore, appendMessage } = useMessages(conversationId)
  const [sending, setSending] = useState(false)
  const [moderationReasons, setModerationReasons] = useState<ModerationReason[] | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)

  // Auto-dismiss the moderation banner after 5 seconds.
  useEffect(() => {
    if (!moderationReasons) return
    const timer = window.setTimeout(() => setModerationReasons(null), 5000)
    return () => window.clearTimeout(timer)
  }, [moderationReasons])

  const onReceiveMessage = useCallback((msg: IncomingMessage) => {
    if (msg.conversationId !== conversationId) return
    appendMessage({
      id: msg.messageId,
      senderId: msg.senderId,
      content: msg.content,
      sentAt: msg.sentAt,
      readAt: null,
    })
  }, [conversationId, appendMessage])

  const onMessageSent = useCallback((msg: IncomingMessage) => {
    if (msg.conversationId !== conversationId) return
    appendMessage({
      id: msg.messageId,
      senderId: msg.senderId,
      content: msg.content,
      sentAt: msg.sentAt,
      readAt: null,
    })
    setSending(false)
  }, [conversationId, appendMessage])

  const { sendMessage, markRead } = useChatConnection({ onReceiveMessage, onMessageSent })

  useEffect(() => {
    markRead(conversationId)
  }, [conversationId, markRead])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = useCallback(async (value: string) => {
    const trimmed = value.trim()
    if (!trimmed || sending) return
    setSending(true)
    setModerationReasons(null)
    try {
      await sendMessage(otherUserId, trimmed)
    } catch (err) {
      const reasons = parseModerationReasons(err)
      if (reasons) setModerationReasons(reasons)
      setSending(false)
    }
  }, [sending, sendMessage, otherUserId])

  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden border border-[rgba(16,217,160,0.3)] bg-[var(--bg-card)] shadow-[0_24px_80px_rgba(0,0,0,0.85),0_0_0_1px_rgba(16,217,160,0.08),0_0_60px_rgba(16,217,160,0.05)]">

      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(16,217,160,0.15)] bg-[rgba(16,217,160,0.03)] select-none">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[rgba(0,0,0,0.15)]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e] border border-[rgba(0,0,0,0.15)]" />
          <div className="w-3 h-3 rounded-full bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.08)]" />
        </div>

        <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
          <div className="w-4 h-4 rounded-sm bg-[rgba(16,217,160,0.1)] border border-[rgba(16,217,160,0.2)] flex items-center justify-center">
            <Terminal size={9} className="text-[var(--green)]" />
          </div>
          <span className="font-mono text-[10px] font-semibold text-[var(--t1)] tracking-[0.12em]">
            @{otherUsername}
          </span>
        </div>

        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[rgba(16,217,160,0.08)] border border-[rgba(16,217,160,0.2)] text-[var(--green)] tracking-wide">
          {sending ? 'SENDING' : 'READY'}
        </span>
      </div>

      {/* Accent line */}
      <div className="h-px bg-gradient-to-r from-[var(--green)] via-[rgba(16,217,160,0.25)] to-transparent" />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 scrollbar-thin scrollbar-thumb-[var(--border-m)] scrollbar-track-transparent">
        {hasMore && (
          <button
            onClick={loadMore}
            className="w-full font-mono text-[9px] text-[var(--t3)] hover:text-[var(--t2)] text-center py-1 transition-colors"
          >
            ↑ load older messages
          </button>
        )}

        {loading && (
          <div className="flex items-center gap-1 py-0.5">
            <span className="font-mono text-[10px] text-[var(--t3)] mr-1">◆</span>
            <span className="w-1 h-1 rounded-full bg-[var(--green)] animate-bounce [animation-delay:0ms]" />
            <span className="w-1 h-1 rounded-full bg-[var(--green)] animate-bounce [animation-delay:150ms]" />
            <span className="w-1 h-1 rounded-full bg-[var(--green)] animate-bounce [animation-delay:300ms]" />
          </div>
        )}

        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} isMine={msg.senderId === currentUserId} />
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Moderation rejection banner — auto-dismisses after 5s */}
      {moderationReasons && (
        <div className="px-3 py-2 border-t border-[rgba(244,63,94,0.25)] bg-[rgba(244,63,94,0.06)] flex items-start gap-2">
          <AlertTriangle size={11} className="text-[var(--red)] mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            {moderationReasons.map((r, i) => (
              <div key={`${r.code}-${i}`} className="font-mono text-[10px] leading-snug text-[var(--red)] break-words">
                <span className="font-bold tracking-[0.06em]">{r.code}</span>
                <span className="text-[var(--t2)]"> — {r.message}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setModerationReasons(null)}
            className="text-[var(--t3)] hover:text-[var(--t1)] transition-colors flex-shrink-0"
            aria-label="Dismiss"
          >
            <X size={11} />
          </button>
        </div>
      )}

      {/* Input — reuses TerminalInput */}
      <TerminalInput onSubmit={handleSubmit} disabled={sending} stage="awaiting-message" />
    </div>
  )
}
