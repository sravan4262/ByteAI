'use client'

import { useState, useEffect, useCallback } from 'react'
import { getMessages, type MessageDto } from '@/lib/api/chat'

export function useMessages(conversationId: string) {
  const [messages, setMessages] = useState<MessageDto[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    setMessages([])
    setHasMore(true)
    setLoading(true)

    getMessages(conversationId).then(data => {
      // API returns newest-first; reverse for display
      setMessages(data.toReversed())
      setHasMore(data.length === 50)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [conversationId])

  const loadMore = useCallback(async () => {
    if (!hasMore || messages.length === 0) return
    const oldest = messages[0].sentAt
    const older = await getMessages(conversationId, oldest)
    setMessages(prev => [...older.toReversed(), ...prev])
    setHasMore(older.length === 50)
  }, [conversationId, hasMore, messages])

  const appendMessage = useCallback((msg: MessageDto) => {
    setMessages(prev => [...prev, msg])
  }, [])

  return { messages, loading, hasMore, loadMore, appendMessage }
}
