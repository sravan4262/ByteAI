'use client'

import { useState, useEffect, useRef, useCallback, type MouseEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, MessageSquare } from 'lucide-react'
import { ChatMessage } from './ChatMessage'
import { ChatLauncher, type OutputLine, HELP_LINES } from './ChatLauncher'
import { TerminalInput } from '@/components/features/terminal/TerminalInput'
import { useMessages } from '@/hooks/use-messages'
import { useChatConnection, type IncomingMessage } from '@/hooks/use-chat-connection'
import { getMutualFollows, type MutualFollowDto, type ConversationDto } from '@/lib/api/chat'
import { getMeCache } from '@/lib/user-cache'

interface TabData {
  conversationId: string
  otherUsername: string
  otherUserId: string
}

interface MessagesPanelProps {
  open: boolean
  onClose: () => void
  conversations: ConversationDto[]
  conversationsLoading: boolean
  markConversationRead: (id: string) => void
  bumpConversation: (conversationId: string, lastMessage: string) => void
}

// ── Thread view ───────────────────────────────────────────────────────────────

function ThreadView({ thread, currentUserId }: { thread: TabData; currentUserId: string }) {
  const { messages, loading, hasMore, loadMore, appendMessage } = useMessages(thread.conversationId)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const onReceiveMessage = useCallback((msg: IncomingMessage) => {
    if (msg.conversationId !== thread.conversationId) return
    appendMessage({ id: msg.messageId, senderId: msg.senderId, content: msg.content, sentAt: msg.sentAt, readAt: null })
  }, [thread.conversationId, appendMessage])

  const onMessageSent = useCallback((msg: IncomingMessage) => {
    if (msg.conversationId !== thread.conversationId) return
    appendMessage({ id: msg.messageId, senderId: msg.senderId, content: msg.content, sentAt: msg.sentAt, readAt: null })
    setSending(false)
  }, [thread.conversationId, appendMessage])

  const { sendMessage, markRead } = useChatConnection({ onReceiveMessage, onMessageSent })

  useEffect(() => {
    markRead(thread.conversationId)
  }, [thread.conversationId, markRead])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = useCallback(async (value: string) => {
    const trimmed = value.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      await sendMessage(thread.otherUserId, trimmed)
    } catch {
      setSending(false)
    }
  }, [sending, sendMessage, thread.otherUserId])

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1 scrollbar-thin scrollbar-thumb-[var(--border-m)] scrollbar-track-transparent">
        {hasMore && (
          <button
            onClick={loadMore}
            className="w-full font-mono text-[10px] text-[var(--t3)] hover:text-[var(--t2)] text-center py-1 transition-colors"
          >
            ↑ load older
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
      <TerminalInput onSubmit={handleSubmit} disabled={sending} stage="awaiting-message" />
    </>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export function MessagesPanel({ open, onClose, conversations, conversationsLoading, markConversationRead, bumpConversation }: MessagesPanelProps) {
  const [tabs, setTabs] = useState<TabData[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null) // null = launcher tab
  const [launcherLines, setLauncherLines] = useState<OutputLine[]>(HELP_LINES)
  const [currentUserId] = useState<string | null>(() => getMeCache()?.userId ?? null)
  const [mutualFollows, setMutualFollows] = useState<MutualFollowDto[]>([])
  const mutualFetched = useRef(false)
  const tabsRef = useRef<TabData[]>([])
  tabsRef.current = tabs
  const activeTabIdRef = useRef<string | null>(null)
  activeTabIdRef.current = activeTabId

  const onReceiveMessage = useCallback((msg: IncomingMessage) => {
    if (activeTabIdRef.current === msg.conversationId) return
    bumpConversation(msg.conversationId, msg.content)
  }, [bumpConversation])

  useChatConnection({ onReceiveMessage })

  useEffect(() => {
    if (!currentUserId || mutualFetched.current) return
    mutualFetched.current = true
    getMutualFollows().then(setMutualFollows).catch(() => {})
  }, [currentUserId])

  const openThread = useCallback((thread: TabData) => {
    markConversationRead(thread.conversationId)
    setTabs(prev =>
      prev.some(t => t.conversationId === thread.conversationId) ? prev : [...prev, thread]
    )
    setActiveTabId(thread.conversationId)
  }, [markConversationRead])

  const closeTab = useCallback((conversationId: string, e?: MouseEvent) => {
    e?.stopPropagation()
    const current = tabsRef.current
    const remaining = current.filter(t => t.conversationId !== conversationId)
    setTabs(remaining)
    setActiveTabId(prev => {
      if (prev !== conversationId) return prev
      if (remaining.length === 0) return null
      const idx = current.findIndex(t => t.conversationId === conversationId)
      return remaining[Math.max(0, idx - 1)].conversationId
    })
  }, [])

  const switchTab = useCallback((conversationId: string | null) => {
    if (conversationId) markConversationRead(conversationId)
    setActiveTabId(conversationId)
  }, [markConversationRead])

  // Keyboard shortcuts — Ctrl+W closes active tab, Ctrl+Tab cycles
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault()
        if (activeTabIdRef.current) closeTab(activeTabIdRef.current)
      }
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault()
        const allIds: (string | null)[] = [null, ...tabsRef.current.map(t => t.conversationId)]
        const idx = allIds.indexOf(activeTabIdRef.current)
        const next = allIds[(idx + 1) % allIds.length]
        switchTab(next)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, closeTab, switchTab])

  const activeThread = tabs.find(t => t.conversationId === activeTabId) ?? null
  const totalUnread = conversations.filter(c => c.hasUnread).length

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="msg-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px]"
            onClick={onClose}
          />

          <motion.div
            key="msg-panel"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-20 right-[3.75rem] z-50 w-[500px] h-[520px] max-w-[calc(100vw-2.5rem)]
                       flex flex-col rounded-xl overflow-hidden
                       border border-[rgba(16,217,160,0.3)] bg-[var(--bg-card)]
                       shadow-[0_24px_80px_rgba(0,0,0,0.85),0_0_0_1px_rgba(16,217,160,0.08),0_0_60px_rgba(16,217,160,0.05)]"
          >
            {/* Accent line */}
            <div className="h-px bg-gradient-to-r from-[var(--green)] via-[rgba(16,217,160,0.25)] to-transparent flex-shrink-0" />

            {/* Header — traffic lights + tab strip */}
            <div className="flex items-stretch border-b border-[rgba(16,217,160,0.15)] bg-[rgba(16,217,160,0.03)] flex-shrink-0 select-none">

              {/* Traffic lights */}
              <div className="flex items-center gap-1.5 px-3 flex-shrink-0 border-r border-[rgba(16,217,160,0.1)]">
                <button
                  onClick={onClose}
                  title="Close"
                  className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[rgba(0,0,0,0.15)] flex items-center justify-center hover:brightness-90 transition-all"
                >
                  <X size={6} className="text-[rgba(0,0,0,0.65)]" />
                </button>
                <div className="w-3 h-3 rounded-full bg-[#febc2e] border border-[rgba(0,0,0,0.15)]" />
                <div className="w-3 h-3 rounded-full bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.08)]" />
              </div>

              {/* Tab strip */}
              <div className="flex items-stretch flex-1 overflow-x-auto scrollbar-none">

                {/* Launcher tab */}
                <button
                  onClick={() => switchTab(null)}
                  title="Chat launcher"
                  className={`flex items-center gap-1.5 px-3 py-2.5 font-mono text-[10px] flex-shrink-0 border-r border-[rgba(16,217,160,0.1)] transition-colors -mb-px ${
                    activeTabId === null
                      ? 'text-[var(--t1)] border-b-2 border-b-[var(--green)] bg-[rgba(16,217,160,0.06)]'
                      : 'text-[var(--t3)] hover:text-[var(--t2)] hover:bg-[rgba(16,217,160,0.03)]'
                  }`}
                >
                  <MessageSquare size={9} className={activeTabId === null ? 'text-[var(--green)]' : ''} />
                  <span className="tracking-[0.1em]">CHAT</span>
                  {totalUnread > 0 && activeTabId !== null && (
                    <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[var(--green)] text-[var(--bg)] font-bold text-[8px]">
                      {totalUnread > 9 ? '9+' : totalUnread}
                    </span>
                  )}
                </button>

                {/* Conversation tabs */}
                {tabs.map(tab => {
                  const isActive = activeTabId === tab.conversationId
                  const hasUnread = conversations.find(c => c.id === tab.conversationId)?.hasUnread ?? false
                  return (
                    <button
                      key={tab.conversationId}
                      onClick={() => switchTab(tab.conversationId)}
                      className={`group flex items-center gap-1.5 px-3 py-2.5 font-mono text-[10px] flex-shrink-0 border-r border-[rgba(16,217,160,0.1)] max-w-[140px] transition-colors -mb-px ${
                        isActive
                          ? 'text-[var(--t1)] border-b-2 border-b-[var(--green)] bg-[rgba(16,217,160,0.06)]'
                          : 'text-[var(--t3)] hover:text-[var(--t2)] hover:bg-[rgba(16,217,160,0.03)]'
                      }`}
                    >
                      <span className="truncate">@{tab.otherUsername}</span>
                      {hasUnread && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] flex-shrink-0 shadow-[0_0_4px_rgba(16,217,160,0.8)]" />
                      )}
                      <span
                        role="button"
                        onClick={e => closeTab(tab.conversationId, e)}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity ml-0.5 flex items-center"
                      >
                        <X size={8} />
                      </span>
                    </button>
                  )
                })}

                {/* Spacer with keyboard hint */}
                {tabs.length > 0 && (
                  <div className="flex items-center px-3 ml-auto flex-shrink-0">
                    <span className="font-mono text-[9px] text-[var(--t3)] opacity-50 whitespace-nowrap">ctrl+w close · ctrl+tab switch</span>
                  </div>
                )}
              </div>
            </div>

            {/* Body */}
            {activeTabId === null ? (
              <ChatLauncher
                lines={launcherLines}
                setLines={setLauncherLines}
                conversations={conversations}
                conversationsLoading={conversationsLoading}
                mutualFollows={mutualFollows}
                onOpenThread={openThread}
                onClose={onClose}
              />
            ) : activeThread && currentUserId ? (
              <ThreadView key={activeThread.conversationId} thread={activeThread} currentUserId={currentUserId} />
            ) : null}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
