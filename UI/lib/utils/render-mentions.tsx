import Link from 'next/link'
import type { ReactNode } from 'react'

// Same regex as the backend MentionExtractor: 3–50 chars, lookarounds prevent
// matches inside emails (foo@bar.com) or word continuations.
const MENTION_RE = /(?<![A-Za-z0-9_])@([A-Za-z0-9_]{3,50})(?![A-Za-z0-9_])/g

/**
 * Splits a body string into a mix of plain-text spans and `<Link>` elements
 * for any `@username` mention. Used by post / comment / interview body
 * renderers so mentions become tappable profile links — web parity with the
 * iOS attributed-string renderer.
 */
export function renderMentions(text: string | null | undefined): ReactNode[] {
  if (!text) return []

  const parts: ReactNode[] = []
  let lastIndex = 0
  let key = 0

  for (const match of text.matchAll(MENTION_RE)) {
    const start = match.index ?? 0
    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start))
    }
    const username = match[1]
    parts.push(
      <Link
        key={`m-${key++}`}
        href={`/u/${username}`}
        className="text-[var(--accent)] hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        @{username}
      </Link>,
    )
    lastIndex = start + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}
