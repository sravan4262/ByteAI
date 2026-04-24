'use client'

import { useState, useEffect, useCallback } from 'react'
import { getConversations, type ConversationDto } from '@/lib/api/chat'

export function useConversations(enabled = false) {
  const [conversations, setConversations] = useState<ConversationDto[]>([])
  const [loading, setLoading] = useState(enabled)

  const load = useCallback(async () => {
    try {
      const data = await getConversations()
      setConversations(data)
    } catch {
      // silently retain stale data
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    load()
  }, [enabled, load])

  const markConversationRead = useCallback((conversationId: string) => {
    setConversations(prev =>
      prev.map(c => c.id === conversationId ? { ...c, hasUnread: false } : c)
    )
  }, [])

  const bumpConversation = useCallback((conversationId: string, lastMessage: string) => {
    setConversations(prev => {
      const idx = prev.findIndex(c => c.id === conversationId)
      if (idx === -1) return prev
      const updated = { ...prev[idx], lastMessage, lastMessageAt: new Date().toISOString(), hasUnread: true }
      return [updated, ...prev.filter((_, i) => i !== idx)]
    })
  }, [])

  return { conversations, loading, reload: load, markConversationRead, bumpConversation }
}
