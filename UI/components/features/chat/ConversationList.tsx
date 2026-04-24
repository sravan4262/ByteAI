'use client'

import { ConversationItem } from './ConversationItem'
import type { ConversationDto } from '@/lib/api/chat'

interface Props {
  conversations: ConversationDto[]
  loading: boolean
  activeId?: string
}

export function ConversationList({ conversations, loading, activeId }: Props) {
  if (loading) {
    return (
      <div className="flex flex-col gap-1 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-[var(--bg-2)] rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <span className="font-mono text-[10px] text-[var(--t3)] tracking-widest uppercase">
          no conversations
        </span>
        <p className="font-mono text-[10px] text-[var(--t3)] mt-2 opacity-60">
          follow each other to start messaging
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map(c => (
        <ConversationItem key={c.id} conversation={c} active={c.id === activeId} />
      ))}
    </div>
  )
}
