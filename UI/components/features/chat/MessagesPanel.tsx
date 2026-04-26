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
  /** Snapshot at open time. Re-derived from the live conversations list on every render
   *  so a follow/unfollow during the session updates the input state instantly. */
  canMessage: boolean
}

interface MessagesPanelProps {
  open: boolean
  onClose: () => void
  conversations: ConversationDto[]
  conversationsLoading: boolean
  reloadConversations: () => void
  markConversationRead: (id: string) => void
  bumpConversation: (conversationId: string, lastMessage: string) => void
}

const CHAT_COMPLETIONS = [
  '/shrug',
  '/lgtm',
  '/wip',
  '/brb',
  '/gtg',
  '/thanks',
  '/wave',
]

// ── Thread view ───────────────────────────────────────────────────────────────

function ThreadView({ thread, currentUserId, canMessage }: { thread: TabData; currentUserId: string; canMessage: boolean }) {
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
    if (!canMessage) return
    const trimmed = value.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      await sendMessage(thread.otherUserId, trimmed)
    } catch {
      setSending(false)
    }
  }, [canMessage, sending, sendMessage, thread.otherUserId])

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
      {!canMessage && (
        <div className="flex items-center gap-2 px-4 py-2 border-t border-[rgba(16,217,160,0.15)] bg-[rgba(16,217,160,0.03)] font-mono text-[10px] text-[var(--t2)]">
          <span className="text-[var(--green)] opacity-60 flex-shrink-0">◆</span>
          <span>you must follow each other to send messages</span>
        </div>
      )}
      <TerminalInput
        onSubmit={handleSubmit}
        disabled={sending || !canMessage}
        stage="awaiting-message"
        completions={CHAT_COMPLETIONS}
      />
    </>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export function MessagesPanel({ open, onClose, conversations, conversationsLoading, reloadConversations, markConversationRead, bumpConversation }: MessagesPanelProps) {
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
  const openRef = useRef(open)
  openRef.current = open

  const onReceiveMessage = useCallback((msg: IncomingMessage) => {
    // Skip the bump only when the user is *actively viewing* this thread —
    // panel must be open AND active tab must match. Otherwise update the
    // unread state so the chat-button dot and conversation list reflect it.
    if (openRef.current && activeTabIdRef.current === msg.conversationId) return
    bumpConversation(msg.conversationId, msg.content)
  }, [bumpConversation])

  useChatConnection({ onReceiveMessage })

  // Refresh the conversation list every time the panel opens. This catches
  // unread messages that arrived before the SignalR connection was established
  // (the connection is lazy and only starts on the first chat-button click).
  useEffect(() => {
    if (open) reloadConversations()
  }, [open, reloadConversations])

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

  // Keyboard shortcuts — Ctrl+W closes active tab, Esc closes the panel
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault()
        if (activeTabIdRef.current) closeTab(activeTabIdRef.current)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, closeTab, onClose])

  const activeThread = tabs.find(t => t.conversationId === activeTabId) ?? null
  const totalUnread = conversations.filter(c => c.hasUnread).length
  // Re-derive live canMessage from the conversations list so a follow/unfollow during the
  // session updates the input state on the next list refresh — the snapshot in TabData is
  // only the initial value at open time.
  const activeCanMessage = activeThread
    ? conversations.find(c => c.id === activeThread.conversationId)?.canMessage ?? activeThread.canMessage
    : false

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
            className="fixed bottom-20 right-[3.75rem] z-50 w-[560px] h-[600px] max-w-[calc(100vw-2.5rem)]
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
                  className="w-3.5 h-3.5 rounded-full bg-[#ff5f57] border border-[rgba(0,0,0,0.15)] flex items-center justify-center hover:brightness-90 transition-all"
                >
                  <X size={7} className="text-[rgba(0,0,0,0.65)]" />
                </button>
                <div className="w-3.5 h-3.5 rounded-full bg-[#febc2e] border border-[rgba(0,0,0,0.15)]" />
                <div className="w-3.5 h-3.5 rounded-full bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.08)]" />
              </div>

              {/* Tab strip */}
              <div className="flex items-stretch flex-1 overflow-x-auto scrollbar-none">

                {/* Launcher tab */}
                <button
                  onClick={() => switchTab(null)}
                  title="Chat launcher"
                  className={`flex items-center gap-1.5 px-3.5 py-3 font-mono text-[11px] flex-shrink-0 border-r border-[rgba(16,217,160,0.1)] transition-colors -mb-px ${
                    activeTabId === null
                      ? 'text-[var(--t1)] border-b-2 border-b-[var(--green)] bg-[rgba(16,217,160,0.06)] font-semibold'
                      : 'text-[var(--t2)] hover:text-[var(--t1)] hover:bg-[rgba(16,217,160,0.03)]'
                  }`}
                >
                  <MessageSquare size={11} className={activeTabId === null ? 'text-[var(--green)]' : ''} />
                  <span className="tracking-[0.1em]">CHAT</span>
                  {totalUnread > 0 && activeTabId !== null && (
                    <span className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[var(--green)] text-[var(--bg)] font-bold text-[9px]">
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
                      className={`group flex items-center gap-1.5 px-3.5 py-3 font-mono text-[11px] flex-shrink-0 border-r border-[rgba(16,217,160,0.1)] max-w-[160px] transition-colors -mb-px ${
                        isActive
                          ? 'text-[var(--t1)] border-b-2 border-b-[var(--green)] bg-[rgba(16,217,160,0.06)] font-semibold'
                          : 'text-[var(--t2)] hover:text-[var(--t1)] hover:bg-[rgba(16,217,160,0.03)]'
                      }`}
                    >
                      <span className="truncate">@{tab.otherUsername}</span>
                      {hasUnread && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] flex-shrink-0 shadow-[0_0_4px_rgba(16,217,160,0.8)]" />
                      )}
                      <span
                        role="button"
                        onClick={e => closeTab(tab.conversationId, e)}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity ml-0.5 flex items-center"
                      >
                        <X size={10} />
                      </span>
                    </button>
                  )
                })}

                {/* Spacer with keyboard hint */}
                {tabs.length > 0 && (
                  <div className="hidden md:flex items-center px-3 ml-auto flex-shrink-0">
                    <span className="font-mono text-[10px] text-[var(--t2)] opacity-70 whitespace-nowrap">ctrl+w close</span>
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
                reloadConversations={reloadConversations}
                mutualFollows={mutualFollows}
                onOpenThread={openThread}
                onClose={onClose}
              />
            ) : activeThread && currentUserId ? (
              <ThreadView
                key={activeThread.conversationId}
                thread={activeThread}
                currentUserId={currentUserId}
                canMessage={activeCanMessage}
              />
            ) : null}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
