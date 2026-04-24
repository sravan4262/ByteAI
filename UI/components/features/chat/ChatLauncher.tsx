'use client'

import { useState, useRef, useCallback, useEffect, KeyboardEvent, type Dispatch, type SetStateAction } from 'react'
import { ConversationItem } from './ConversationItem'
import { getMutualFollows, getOrCreateConversation, type MutualFollowDto, type ConversationDto } from '@/lib/api/chat'
import { Skeleton } from '@/components/ui/skeleton'

interface ActiveThread {
  conversationId: string
  otherUsername: string
  otherUserId: string
}

interface Props {
  lines: OutputLine[]
  setLines: Dispatch<SetStateAction<OutputLine[]>>
  conversations: ConversationDto[]
  conversationsLoading: boolean
  mutualFollows: MutualFollowDto[]
  onOpenThread: (thread: ActiveThread) => void
  onClose: () => void
}

export type OutputLine =
  | { kind: 'cmd'; text: string }
  | { kind: 'text'; text: string; dim?: boolean }
  | { kind: 'divider' }
  | { kind: 'conversation'; conv: ConversationDto }
  | { kind: 'contact'; person: MutualFollowDto; index: number }
  | { kind: 'error'; text: string }

export const HELP_LINES: OutputLine[] = [
  { kind: 'text', text: '◆  CHAT v1.0' },
  { kind: 'divider' },
  { kind: 'text', text: 'Commands:' },
  { kind: 'text', text: '  inbox                   view your conversations' },
  { kind: 'text', text: '  dm @username            open or start a DM' },
  { kind: 'text', text: '  search "query"          search mutual follows' },
  { kind: 'text', text: '  recent                  last 5 people you messaged' },
  { kind: 'text', text: '  clear                   clear terminal' },
  { kind: 'text', text: '  exit / Ctrl+C           close' },
]

export function ChatLauncher({ lines, setLines, conversations, conversationsLoading, mutualFollows, onOpenThread, onClose }: Props) {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [pendingContacts, setPendingContacts] = useState<MutualFollowDto[]>([])
  const [searching, setSearching] = useState(false)
  const [creatingConv, setCreatingConv] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  const append = useCallback((...newLines: OutputLine[]) => {
    setLines(prev => [...prev, ...newLines])
  }, [])

  const openContact = useCallback(async (person: MutualFollowDto) => {
    if (creatingConv) return
    setCreatingConv(true)
    append({ kind: 'text', text: `◆ opening @${person.username}...`, dim: true })
    try {
      const conversationId = await getOrCreateConversation(person.id)
      onOpenThread({ conversationId, otherUsername: person.username, otherUserId: person.id })
    } catch {
      append({ kind: 'error', text: '✗ failed to open conversation' })
    } finally {
      setCreatingConv(false)
    }
  }, [creatingConv, append, onOpenThread])

  const executeCommand = useCallback(async (raw: string) => {
    const cmd = raw.trim()
    if (!cmd) return

    setHistory(prev => [cmd, ...prev].slice(0, 50))
    setHistoryIdx(-1)
    setInput('')
    setPendingContacts([])
    append({ kind: 'cmd', text: cmd })

    const [command, ...args] = cmd.split(/\s+/)

    switch (command.toLowerCase()) {
      case 'help':
        append(...HELP_LINES)
        break

      case 'inbox':
        if (conversationsLoading) {
          append({ kind: 'text', text: '◆ loading...', dim: true })
        } else if (conversations.length === 0) {
          append({ kind: 'text', text: '◆ no conversations yet', dim: true })
        } else {
          append(
            { kind: 'text', text: `◆ ${conversations.length} conversation${conversations.length === 1 ? '' : 's'}` },
            ...conversations.slice(0, 10).map(c => ({ kind: 'conversation' as const, conv: c }))
          )
        }
        break

      case 'recent': {
        const recent = conversations.slice(0, 5)
        if (recent.length === 0) {
          append({ kind: 'text', text: '◆ no recent conversations', dim: true })
        } else {
          append(
            { kind: 'text', text: '◆ recent — type a number to open' },
            ...recent.map((c, i) => ({ kind: 'contact' as const, person: { id: c.otherUserId, username: c.otherUsername, displayName: c.otherDisplayName, avatarUrl: c.otherAvatarUrl }, index: i + 1 }))
          )
          setPendingContacts(recent.map(c => ({ id: c.otherUserId, username: c.otherUsername, displayName: c.otherDisplayName, avatarUrl: c.otherAvatarUrl })))
        }
        break
      }

      case 'search': {
        const query = args.join(' ').replace(/^["']|["']$/g, '')
        setSearching(true)
        append({ kind: 'text', text: `◆ searching mutual follows${query ? ` for "${query}"` : ''}...`, dim: true })
        try {
          const results = await getMutualFollows(query || undefined)
          if (results.length === 0) {
            append({ kind: 'text', text: '◆ no mutual follows found', dim: true })
          } else {
            append(
              { kind: 'text', text: `◆ ${results.length} result${results.length === 1 ? '' : 's'} — click or type number` },
              ...results.map((p, i) => ({ kind: 'contact' as const, person: p, index: i + 1 }))
            )
            setPendingContacts(results)
          }
        } catch {
          append({ kind: 'error', text: '✗ search failed' })
        } finally {
          setSearching(false)
        }
        break
      }

      case 'dm': {
        const handle = args[0]?.replace(/^@/, '')
        if (!handle) { append({ kind: 'error', text: '✗ usage: dm @username' }); break }

        const lc = handle.toLowerCase()
        const fromMutuals = mutualFollows.find(p => p.username.toLowerCase() === lc)
        const fromConvs = conversations.find(c => c.otherUsername.toLowerCase() === lc)
        const cached: MutualFollowDto | undefined = fromMutuals ?? (fromConvs
          ? { id: fromConvs.otherUserId, username: fromConvs.otherUsername, displayName: fromConvs.otherDisplayName, avatarUrl: fromConvs.otherAvatarUrl }
          : undefined)

        if (cached) {
          await openContact(cached)
        } else {
          append({ kind: 'text', text: `◆ looking up @${handle}...`, dim: true })
          try {
            const results = await getMutualFollows(handle)
            const found = results.find(p => p.username.toLowerCase() === lc)
            if (found) {
              await openContact(found)
            } else {
              append({ kind: 'error', text: `✗ @${handle} not found in mutual follows` })
            }
          } catch {
            append({ kind: 'error', text: '✗ lookup failed' })
          }
        }
        break
      }

      case 'clear':
        setLines(HELP_LINES)
        setPendingContacts([])
        break

      case 'exit':
      case 'quit':
        onClose()
        break

      default: {
        const num = parseInt(command, 10)
        if (!isNaN(num) && num >= 1 && num <= pendingContacts.length) {
          await openContact(pendingContacts[num - 1])
        } else {
          append({ kind: 'error', text: `✗ unknown command: ${command}. type 'help' for commands.` })
        }
      }
    }
  }, [conversations, conversationsLoading, mutualFollows, pendingContacts, append, openContact, onClose])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(input)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHistoryIdx(prev => {
        const next = Math.min(prev + 1, history.length - 1)
        setInput(history[next] ?? '')
        return next
      })
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHistoryIdx(prev => {
        const next = Math.max(prev - 1, -1)
        setInput(next === -1 ? '' : history[next] ?? '')
        return next
      })
    } else if (e.ctrlKey && e.key === 'c') {
      e.preventDefault()
      if (input) { setInput(''); setHistoryIdx(-1) } else { onClose() }
    }
  }, [input, history, executeCommand, onClose])

  return (
    <div className="flex flex-col flex-1 overflow-hidden" onClick={() => inputRef.current?.focus()}>
      {/* Output */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5 scrollbar-thin scrollbar-thumb-[var(--border-m)] scrollbar-track-transparent">
        {lines.map((line, i) => {
          if (line.kind === 'divider') {
            return <div key={i} className="h-px bg-[rgba(16,217,160,0.1)] my-1.5" />
          }
          if (line.kind === 'cmd') {
            return (
              <div key={i} className="flex items-start gap-2 font-mono text-[11px]">
                <span className="text-[var(--green)] flex-shrink-0 select-none">{'>'}</span>
                <span className="text-[var(--t1)]">{line.text}</span>
              </div>
            )
          }
          if (line.kind === 'text') {
            return (
              <p key={i} className={`font-mono text-[11px] whitespace-pre ${line.dim ? 'text-[var(--t3)]' : 'text-[var(--t2)]'}`}>
                {line.text}
              </p>
            )
          }
          if (line.kind === 'error') {
            return (
              <p key={i} className="font-mono text-[11px] text-red-400">{line.text}</p>
            )
          }
          if (line.kind === 'conversation') {
            return (
              <ConversationItem
                key={`conv-${line.conv.id}-${i}`}
                conversation={line.conv}
                onClick={() => onOpenThread({ conversationId: line.conv.id, otherUsername: line.conv.otherUsername, otherUserId: line.conv.otherUserId })}
              />
            )
          }
          if (line.kind === 'contact') {
            return (
              <button
                key={`contact-${line.person.id}-${i}`}
                onClick={() => openContact(line.person)}
                className="group w-full flex items-center gap-3 px-2 py-1.5 rounded hover:bg-[rgba(16,217,160,0.05)] transition-colors text-left"
              >
                <span className="font-mono text-[10px] text-[var(--t3)] w-4 flex-shrink-0">{line.index}.</span>
                <div className="w-6 h-6 rounded-sm bg-[rgba(16,217,160,0.1)] border border-[rgba(16,217,160,0.2)] flex items-center justify-center flex-shrink-0">
                  <span className="font-mono text-[9px] text-[var(--green)] uppercase">{line.person.username.charAt(0)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-[11px] text-[var(--t1)] block truncate">{line.person.displayName || line.person.username}</span>
                  <span className="font-mono text-[10px] text-[var(--t2)] block truncate">@{line.person.username}</span>
                </div>
                <span className="font-mono text-[10px] text-[var(--green)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">→</span>
              </button>
            )
          }
          return null
        })}

        {(searching || creatingConv) && (
          <div className="flex items-center gap-1 py-0.5 px-2">
            <span className="w-1 h-1 rounded-full bg-[var(--green)] animate-bounce [animation-delay:0ms]" />
            <span className="w-1 h-1 rounded-full bg-[var(--green)] animate-bounce [animation-delay:150ms]" />
            <span className="w-1 h-1 rounded-full bg-[var(--green)] animate-bounce [animation-delay:300ms]" />
          </div>
        )}
        {conversationsLoading && (
          <div className="flex flex-col gap-1 px-2 py-1">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-[rgba(16,217,160,0.12)] bg-[rgba(16,217,160,0.02)] flex-shrink-0">
        <span className="font-mono text-[11px] text-[var(--t3)] flex-shrink-0 select-none">byteai @ ~ $</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="type a command..."
          autoFocus
          spellCheck={false}
          className="flex-1 bg-transparent font-mono text-[11px] text-[var(--t1)] placeholder:text-[var(--t3)] outline-none caret-[var(--green)]"
        />
        <span className="w-[2px] h-3.5 bg-[var(--green)] animate-pulse flex-shrink-0" />
      </div>
    </div>
  )
}
