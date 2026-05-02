/**
 * Validates a `next` redirect target so we never bounce a freshly signed-in
 * user to an attacker-controlled origin (open-redirect).
 *
 * A path is considered safe iff:
 *  - it's a non-empty string
 *  - it starts with a single `/`
 *  - it does NOT start with `//` (protocol-relative URL)
 *  - it does NOT start with `/\` (Windows-style protocol-relative)
 *  - it does NOT contain a scheme (`://`)
 */
export function isSafeRelativePath(value: string | null | undefined): value is string {
  if (!value) return false
  if (typeof value !== 'string') return false
  if (!value.startsWith('/')) return false
  if (value.startsWith('//')) return false
  if (value.startsWith('/\\')) return false
  if (value.includes('://')) return false
  return true
}

export function safeNextOr(value: string | null | undefined, fallback: string): string {
  return isSafeRelativePath(value) ? value : fallback
}
