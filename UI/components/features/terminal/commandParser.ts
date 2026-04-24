export type FeedbackType = 'good' | 'bad' | 'idea'

export type ParsedCommand =
  | { cmd: 'help' }
  | { cmd: 'clear' }
  | { cmd: 'exit' }
  | { cmd: 'history' }
  | { cmd: 'whoami' }
  | { cmd: 'feedback'; feedbackType: FeedbackType; inlineMessage?: string }
  | { cmd: 'unknown'; raw: string }
  | { cmd: 'error'; message: string }

const FEEDBACK_TYPES: FeedbackType[] = ['good', 'bad', 'idea']

export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim()
  const lower   = trimmed.toLowerCase()
  if (!lower) return { cmd: 'unknown', raw: input }

  const base = lower.split(/\s+/)[0]

  if (base === 'help')    return { cmd: 'help' }
  if (base === 'clear')   return { cmd: 'clear' }
  if (base === 'exit')    return { cmd: 'exit' }
  if (base === 'history') return { cmd: 'history' }
  if (base === 'whoami')  return { cmd: 'whoami' }

  if (base === 'feedback') {
    const typeMatch = /--type\s+(good|bad|idea)/i.exec(trimmed)
    if (!typeMatch) {
      return { cmd: 'error', message: 'Usage: feedback --type good|bad|idea ["message"]' }
    }
    const t = typeMatch[1].toLowerCase() as FeedbackType
    if (!FEEDBACK_TYPES.includes(t)) {
      return { cmd: 'error', message: `Unknown type "${t}". Use: good, bad, idea` }
    }

    // Everything after "--type X" is an optional inline message
    const afterType = trimmed.slice(typeMatch.index + typeMatch[0].length).trim()
    const inlineMessage = afterType
      ? afterType.replace(/^["']|["']$/g, '').trim()
      : undefined

    return { cmd: 'feedback', feedbackType: t, inlineMessage: inlineMessage || undefined }
  }

  return { cmd: 'unknown', raw: input }
}
