/**
 * Session-scoped cache for the logged-in user's own data.
 * Populated once on app load by AuthGuard, cleared on logout.
 * Using sessionStorage so it naturally clears when the tab is closed.
 */

const KEY = 'byteai_me'

export interface MeCache {
  userId: string       // backend UUID
  username: string
  displayName: string
  avatarUrl?: string | null
  bio?: string
  roleTitle?: string
  company?: string
  level: number
  bytesCount: number
  followersCount: number
  followingCount: number
  isVerified: boolean
}

export function getMeCache(): MeCache | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as MeCache) : null
  } catch {
    return null
  }
}

export function setMeCache(data: MeCache): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data))
  } catch {}
}

export function clearMeCache(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(KEY)
  } catch {}
}
