import { apiFetch } from './http'

interface ApiResponse<T> {
  data: T
}

interface PagedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface FlaggedUser {
  userId: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  flagCount: number
  contentTypes: string[]
  isBanned: boolean
}

export interface BannedUser {
  userId: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  reason: string
  bannedAt: string
  expiresAt: string | null
}

export interface UserBan {
  userId: string
  reason: string
  bannedAt: string
  expiresAt: string | null
}

export interface FlaggedContent {
  id: string
  contentType: string
  contentId: string
  reasonCode: string
  reasonMessage: string | null
  severity: string
  status: string
  excerpt: string | null
  authorId: string | null
  authorUsername: string | null
  authorDisplayName: string | null
  authorAvatarUrl: string | null
  reporterId: string | null
  reporterUsername: string | null
  createdAt: string
  resolvedAt: string | null
  resolvedBy: string | null
}

export interface UserBanHistory {
  id: string
  userId: string
  reason: string
  bannedAt: string
  expiresAt: string | null
  bannedBy: string | null
  bannedByUsername: string | null
  liftedAt: string | null
  liftedBy: string | null
  liftedByUsername: string | null
}

export async function getFlaggedUsers(threshold = 5): Promise<FlaggedUser[]> {
  try {
    const res = await apiFetch<ApiResponse<FlaggedUser[]>>(
      `/api/admin/moderation/flagged-users?threshold=${threshold}`
    )
    return res.data
  } catch {
    return []
  }
}

export async function getBannedUsers(): Promise<BannedUser[]> {
  try {
    const res = await apiFetch<ApiResponse<BannedUser[]>>('/api/admin/moderation/bans')
    return res.data
  } catch {
    return []
  }
}

export async function banUser(data: {
  userId: string
  reason: string
  expiresAt?: string | null
}): Promise<UserBan | null> {
  try {
    const res = await apiFetch<ApiResponse<UserBan>>('/api/admin/moderation/bans', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return res.data
  } catch {
    return null
  }
}

export async function unbanUser(userId: string): Promise<boolean> {
  try {
    await apiFetch(`/api/admin/moderation/bans/${userId}`, { method: 'DELETE' })
    return true
  } catch {
    return false
  }
}

// ── Flag triage ──────────────────────────────────────────────────────────────

export interface FlagFilter {
  status?: string
  contentType?: string
  severity?: string
  authorId?: string
  page?: number
  pageSize?: number
}

export async function getFlaggedContent(filter: FlagFilter = {}): Promise<PagedResponse<FlaggedContent>> {
  const qs = new URLSearchParams()
  if (filter.status)      qs.set('status', filter.status)
  if (filter.contentType) qs.set('contentType', filter.contentType)
  if (filter.severity)    qs.set('severity', filter.severity)
  if (filter.authorId)    qs.set('authorId', filter.authorId)
  qs.set('page',     String(filter.page ?? 1))
  qs.set('pageSize', String(filter.pageSize ?? 20))

  try {
    const res = await apiFetch<ApiResponse<PagedResponse<FlaggedContent>>>(
      `/api/admin/moderation/flags?${qs.toString()}`
    )
    return res.data
  } catch {
    return { items: [], total: 0, page: filter.page ?? 1, pageSize: filter.pageSize ?? 20 }
  }
}

export async function getUserFlags(userId: string): Promise<FlaggedContent[]> {
  try {
    const res = await apiFetch<ApiResponse<FlaggedContent[]>>(
      `/api/admin/moderation/users/${userId}/flags`
    )
    return res.data
  } catch {
    return []
  }
}

export async function updateFlagStatus(
  flagId: string,
  status: 'open' | 'reviewing' | 'removed' | 'dismissed',
  note?: string,
): Promise<FlaggedContent | null> {
  try {
    const res = await apiFetch<ApiResponse<FlaggedContent>>(
      `/api/admin/moderation/flags/${flagId}`,
      { method: 'PUT', body: JSON.stringify({ status, note }) },
    )
    return res.data
  } catch {
    return null
  }
}

// ── Aggregated views (Phase 1.5) ─────────────────────────────────────────────

export interface FlagsByAuthorEntry {
  authorId: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  totalFlags: number
  userReports: number
  autoFlags: number
  lastFlaggedAt: string
}

export interface FlagsByReporterEntry {
  reporterId: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  totalReports: number
  dismissedCount: number
  dismissRate: number
  lastReportedAt: string
}

export async function getFlagsByAuthor(page = 1, pageSize = 20): Promise<FlagsByAuthorEntry[]> {
  try {
    const res = await apiFetch<ApiResponse<FlagsByAuthorEntry[]>>(
      `/api/admin/moderation/by-author?page=${page}&pageSize=${pageSize}`,
    )
    return res.data
  } catch {
    return []
  }
}

export async function getFlagsByReporter(page = 1, pageSize = 20): Promise<FlagsByReporterEntry[]> {
  try {
    const res = await apiFetch<ApiResponse<FlagsByReporterEntry[]>>(
      `/api/admin/moderation/by-reporter?page=${page}&pageSize=${pageSize}`,
    )
    return res.data
  } catch {
    return []
  }
}

export async function dismissFlag(flagId: string): Promise<FlaggedContent | null> {
  try {
    const res = await apiFetch<ApiResponse<FlaggedContent>>(
      `/api/admin/moderation/flags/${flagId}/dismiss`,
      { method: 'POST' },
    )
    return res.data
  } catch {
    return null
  }
}

export async function deleteFlaggedContent(flagId: string): Promise<FlaggedContent | null> {
  try {
    const res = await apiFetch<ApiResponse<FlaggedContent>>(
      `/api/admin/moderation/flags/${flagId}/delete`,
      { method: 'POST' },
    )
    return res.data
  } catch {
    return null
  }
}

export function deleteConfirmCopy(contentType: string): string {
  if (contentType === 'byte' || contentType === 'interview') {
    return `Hide this ${contentType}? You can restore it later by clearing is_hidden.`
  }
  return `Permanently delete this ${contentType}? This cannot be undone.`
}

export async function getUserBanHistory(userId: string): Promise<UserBanHistory[]> {
  try {
    const res = await apiFetch<ApiResponse<UserBanHistory[]>>(
      `/api/admin/moderation/users/${userId}/ban-history`
    )
    return res.data
  } catch {
    return []
  }
}
