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
      <div className={`max-w-[78%] flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-3 py-2 rounded-md font-mono text-xs leading-relaxed whitespace-pre-wrap break-words ${
            isMine
              ? 'bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] text-[var(--t1)]'
              : 'bg-[rgba(16,217,160,0.12)] border border-[rgba(16,217,160,0.3)] text-[var(--t1)]'
          }`}
        >
          {message.content}
        </div>
        <span className="font-mono text-[10px] text-[var(--t2)] tabular-nums px-1">
          {formatTime(message.sentAt)}
        </span>
      </div>
    </div>
  )
}
