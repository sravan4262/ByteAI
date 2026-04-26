'use client'

import { createContext, useContext, useEffect, useRef, useCallback, type ReactNode } from 'react'
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

type ChatEvent = 'ReceiveMessage' | 'MessageSent'

interface ChatConnectionContextValue {
  subscribe: (event: ChatEvent, handler: (msg: IncomingMessage) => void) => () => void
  sendMessage: (recipientId: string, content: string) => Promise<void>
  markRead: (conversationId: string) => Promise<void>
}

const ChatConnectionContext = createContext<ChatConnectionContextValue | null>(null)

export function ChatConnectionProvider({ children }: { children: ReactNode }) {
  const connectionRef = useRef<signalR.HubConnection | null>(null)
  const receiveHandlers = useRef<Set<(msg: IncomingMessage) => void>>(new Set())
  const sentHandlers = useRef<Set<(msg: IncomingMessage) => void>>(new Set())

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: async () => {
          const { data } = await supabase.auth.getSession()
          if (!data.session) throw new Error('No session')
          return data.session.access_token
        },
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    connection.on('ReceiveMessage', (msg: IncomingMessage) => {
      receiveHandlers.current.forEach(h => h(msg))
    })

    connection.on('MessageSent', (msg: IncomingMessage) => {
      sentHandlers.current.forEach(h => h(msg))
    })

    connectionRef.current = connection
    // Wait for start() to settle before stop(), even on cleanup. Otherwise
    // React Strict Mode's double-mount (dev only) aborts the first negotiate
    // and SignalR's internal logger surfaces "stopped during negotiation"
    // before our .catch() can swallow it. With this chain, the first
    // connection completes its handshake, stops cleanly, and the second
    // mount opens a fresh connection without the noisy error.
    const startPromise = connection.start().catch(() => {})

    return () => {
      void startPromise.then(() => connection.stop()).catch(() => {})
    }
  }, [])

  const subscribe = useCallback((event: ChatEvent, handler: (msg: IncomingMessage) => void) => {
    const set = event === 'ReceiveMessage' ? receiveHandlers : sentHandlers
    set.current.add(handler)
    return () => { set.current.delete(handler) }
  }, [])

  const sendMessage = useCallback(async (recipientId: string, content: string) => {
    if (connectionRef.current?.state !== signalR.HubConnectionState.Connected) return
    await connectionRef.current.invoke('SendMessage', recipientId, content)
  }, [])

  const markRead = useCallback(async (conversationId: string) => {
    if (connectionRef.current?.state !== signalR.HubConnectionState.Connected) return
    await connectionRef.current.invoke('MarkRead', conversationId)
  }, [])

  return (
    <ChatConnectionContext.Provider value={{ subscribe, sendMessage, markRead }}>
      {children}
    </ChatConnectionContext.Provider>
  )
}

export function useChatConnectionContext() {
  const ctx = useContext(ChatConnectionContext)
  if (!ctx) throw new Error('useChatConnectionContext must be used within ChatConnectionProvider')
  return ctx
}
