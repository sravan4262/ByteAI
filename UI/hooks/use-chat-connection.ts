'use client'

import { useEffect, useRef } from 'react'
import { useChatConnectionContext, type IncomingMessage } from '@/context/chat-connection-context'

export type { IncomingMessage }

interface UseChatConnectionOptions {
  onReceiveMessage?: (msg: IncomingMessage) => void
  onMessageSent?: (msg: IncomingMessage) => void
}

export function useChatConnection({ onReceiveMessage, onMessageSent }: UseChatConnectionOptions = {}) {
  const { subscribe, sendMessage, markRead } = useChatConnectionContext()

  // Refs keep the latest callback without re-subscribing on every render
  const onReceiveRef = useRef(onReceiveMessage)
  const onSentRef = useRef(onMessageSent)
  useEffect(() => { onReceiveRef.current = onReceiveMessage }, [onReceiveMessage])
  useEffect(() => { onSentRef.current = onMessageSent }, [onMessageSent])

  useEffect(() => {
    if (!onReceiveMessage) return
    return subscribe('ReceiveMessage', (msg) => onReceiveRef.current?.(msg))
  }, [subscribe]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!onMessageSent) return
    return subscribe('MessageSent', (msg) => onSentRef.current?.(msg))
  }, [subscribe]) // eslint-disable-line react-hooks/exhaustive-deps

  return { sendMessage, markRead }
}
