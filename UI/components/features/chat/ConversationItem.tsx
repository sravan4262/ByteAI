'use client'

import type { ConversationDto } from '@/lib/api/chat'
import { timeAgoCompact } from '@/lib/utils/date'

interface Props {
  conversation: ConversationDto
  active?: boolean
  onClick?: () => void
}

export function ConversationItem({ conversation, active = false, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left block px-4 py-3 border-b border-[var(--border)] transition-colors hover:bg-[rgba(16,217,160,0.05)] border-l-2 ${
        active ? 'bg-[rgba(16,217,160,0.05)] border-l-[var(--green)]' : 'border-l-transparent'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-sm bg-[rgba(16,217,160,0.1)] border border-[rgba(16,217,160,0.25)] flex items-center justify-center flex-shrink-0">
            <span className="font-mono text-[11px] text-[var(--green)] uppercase font-bold">
              {conversation.otherUsername.charAt(0)}
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs text-[var(--t1)] truncate font-medium">
                {conversation.otherUsername}
              </span>
              {conversation.hasUnread && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] flex-shrink-0 shadow-[0_0_4px_rgba(16,217,160,0.8)]" />
              )}
            </div>
            {conversation.lastMessage && (
              <p className="text-xs text-[var(--t2)] truncate mt-0.5">
                {conversation.lastMessage}
              </p>
            )}
          </div>
        </div>

        <span className="font-mono text-[10px] text-[var(--t2)] flex-shrink-0 tabular-nums">
          {timeAgoCompact(conversation.lastMessageAt)}
        </span>
      </div>
    </button>
  )
}
