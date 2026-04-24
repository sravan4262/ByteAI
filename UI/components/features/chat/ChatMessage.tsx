'use client'

import type { MessageDto } from '@/lib/api/chat'

interface Props {
  message: MessageDto
  isMine: boolean
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function ChatMessage({ message, isMine }: Props) {
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-[terminal-line-in_0.15s_ease-out]`}>
      <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-3 py-1.5 rounded font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words ${
            isMine
              ? 'bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-[var(--t1)]'
              : 'bg-[rgba(16,217,160,0.12)] border border-[rgba(16,217,160,0.25)] text-[var(--t1)]'
          }`}
        >
          {message.content}
        </div>
        <span className="font-mono text-[9px] text-[var(--t3)] tabular-nums px-1">
          {formatTime(message.sentAt)}
        </span>
      </div>
    </div>
  )
}
