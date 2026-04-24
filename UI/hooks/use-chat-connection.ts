'use client'

import { useEffect, useRef, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'
import { supabase } from '@/lib/supabase'

const HUB_URL = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5239'}/hubs/chat`

export interface IncomingMessage {
  messageId: string
  conversationId: string
  senderId: string
  content: string
  sentAt: string
}

interface UseChatConnectionOptions {
  onReceiveMessage?: (msg: IncomingMessage) => void
  onMessageSent?: (msg: IncomingMessage) => void
}

export function useChatConnection({ onReceiveMessage, onMessageSent }: UseChatConnectionOptions = {}) {
  const connectionRef = useRef<signalR.HubConnection | null>(null)

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: async () => {
          const { data } = await supabase.auth.getSession()
          return data.session?.access_token ?? ''
        },
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    connection.on('ReceiveMessage', (msg: IncomingMessage) => {
      onReceiveMessage?.(msg)
    })

    connection.on('MessageSent', (msg: IncomingMessage) => {
      onMessageSent?.(msg)
    })

    connection.start().catch(() => {})
    connectionRef.current = connection

    return () => {
      connection.stop().catch(() => {})
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback(async (recipientId: string, content: string) => {
    if (connectionRef.current?.state !== signalR.HubConnectionState.Connected) return
    await connectionRef.current.invoke('SendMessage', recipientId, content)
  }, [])

  const markRead = useCallback(async (conversationId: string) => {
    if (connectionRef.current?.state !== signalR.HubConnectionState.Connected) return
    await connectionRef.current.invoke('MarkRead', conversationId)
  }, [])

  return { sendMessage, markRead }
}
