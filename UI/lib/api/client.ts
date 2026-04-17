import { apiFetch } from './http'
import type { User } from '../types'

// Domain types
export type {
  User,
  BytePost,
  Badge,
  Reaction,
  Bookmark,
  Notification,
} from '../types'

// ── Frontend view types ────────────────────────────────────────────────────────
// Canonical shapes used by all UI components.

export interface Post {
  id: string
  author: User
  title: string
  body: string
  code?: { language: string; filename: string; content: string }
  tags: string[]
  reactions: Array<{ emoji: string; count: number }>
  comments: number
  likes: number
  createdAt: string
  isLiked: boolean
  isBookmarked: boolean
  views?: number
  type: 'byte' | 'interview'
}

export interface Comment {
  id: string
  postId: string
  author: User
  content: string
  votes: number
  createdAt: string
  badge?: string
}

// Backend response shapes (mirroring C# ViewModels)
interface ByteResponse {
  id: string
  authorId: string
  authorUsername?: string
  authorDisplayName?: string
  authorAvatarUrl?: string
  authorRole?: string
  authorCompany?: string
  title: string
  body: string
  codeSnippet?: string
  language?: string
  tags?: string[]
  type: string
  createdAt: string
  updatedAt: string
  commentCount: number
  likeCount: number
  isLiked?: boolean
  isBookmarked?: boolean
}

export interface BadgeResponse {
  name: string
  label: string
  icon: string
  description?: string
  earnedAt: string
}

export interface UserResponse {
  id: string
  username: string
  displayName: string
  bio?: string
  avatarUrl?: string
  company?: string
  roleTitle?: string
  seniority?: string
  domain?: string
  level: number
  xp: number
  streak: number
  isOnboarded: boolean
  isVerified: boolean
  role: string
  createdAt: string
  badges: BadgeResponse[]
  // Extended stats (returned by some endpoints)
  bytesCount?: number
  followersCount?: number
  followingCount?: number
  isFollowedByMe?: boolean
  techStack?: string[]
}

export interface SeniorityTypeResponse {
  id: string
  name: string
  label: string
  icon: string
  sortOrder: number
}

export interface DomainResponse {
  id: string
  name: string
  label: string
  icon: string
  sortOrder: number
}

export interface SubdomainResponse {
  id: string
  domainId: string
  name: string
  label: string
  sortOrder: number
}

export interface TechStackResponse {
  id: string
  domainId: string
  name: string
  label: string
  sortOrder: number
}

interface ApiResponse<T> { data: T }
interface PagedResponse<T> { items: T[]; total: number; page: number; pageSize: number }

function byteToPost(b: ByteResponse): Post {
  const username = b.authorUsername || b.authorId.slice(0, 8)
  const displayName = b.authorDisplayName || b.authorUsername || b.authorId.slice(0, 8)
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || username.slice(0, 2).toUpperCase()
  return {
    id: b.id,
    title: b.title,
    body: b.body,
    author: {
      id: b.authorId,
      username,
      displayName,
      initials,
      avatarUrl: b.authorAvatarUrl,
      role: b.authorRole ?? '',
      company: b.authorCompany ?? '',
      bio: '',
      level: 1,
      xp: 0,
      xpToNextLevel: 1000,
      followers: 0,
      following: 0,
      bytes: 0,
      reactions: 0,
      streak: 0,
      techStack: [],
      feedPreferences: [],
      links: [],
      badges: [],
      isVerified: false,
      isOnline: false,
    },
    code: b.codeSnippet ? { language: b.language ?? 'TEXT', filename: 'snippet', content: b.codeSnippet } : undefined,
    tags: b.tags ?? [],
    reactions: [],
    comments: b.commentCount ?? 0,
    likes: b.likeCount ?? 0,
    createdAt: new Date(b.createdAt).toLocaleDateString(),
    isLiked: b.isLiked ?? false,
    isBookmarked: b.isBookmarked ?? false,
    views: 0,
    type: b.type === 'interview' ? 'interview' : 'byte',
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH API — handled by Supabase; see hooks/use-auth.ts
// ═══════════════════════════════════════════════════════════════════════════

export async function getCurrentUser(): Promise<UserResponse | null> {
  try {
    const res = await apiFetch<ApiResponse<UserResponse>>('/api/users/me')
    return res.data
  } catch {
    return null
  }
}

// export async function syncCurrentUser(): Promise<UserResponse | null> {
//   try {
//     const res = await apiFetch<ApiResponse<UserResponse>>('/api/users/me/sync', { method: 'POST' })
//     return res.data
//   } catch {
//     return null
//   }
// }

// ═══════════════════════════════════════════════════════════════════════════
// INTERVIEWS API — full Q&A format
// ═══════════════════════════════════════════════════════════════════════════

export interface InterviewQuestion {
  id: string
  question: string
  answer: string
  orderIndex: number
  likeCount: number
  commentCount: number
  isLiked: boolean
}

export interface InterviewWithQuestions {
  id: string
  authorId: string
  authorUsername?: string
  authorDisplayName?: string
  authorAvatarUrl?: string
  authorRole?: string
  authorCompany?: string
  title: string
  company?: string
  role?: string
  location?: string
  difficulty: string
  type: string
  createdAt: string
  commentCount: number
  questions: InterviewQuestion[]
  isBookmarked?: boolean
  isAnonymous?: boolean
}

interface InterviewPagedResponse {
  items: InterviewWithQuestions[]
  total: number
  page: number
  pageSize: number
}

export async function getInterview(id: string, token?: string | null): Promise<InterviewWithQuestions | null> {
  try {
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5239'
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${BASE_URL}/api/interviews/${id}`, { headers })
    if (!res.ok) throw new Error(`${res.status}`)
    const data: ApiResponse<InterviewWithQuestions> = await res.json()
    return data.data
  } catch {
    return null
  }
}

export async function getInterviews(params: {
  company?: string
  role?: string
  location?: string
  stack?: string
  page?: number
  pageSize?: number
  authorId?: string
} = {}): Promise<{ interviews: InterviewWithQuestions[]; total: number; hasMore: boolean }> {
  try {
    const qs = new URLSearchParams()
    if (params.company) qs.set('company', params.company)
    if (params.role) qs.set('role', params.role)
    if (params.location) qs.set('location', params.location)
    if (params.stack) qs.set('stack', params.stack)
    if (params.page) qs.set('page', String(params.page))
    if (params.pageSize) qs.set('pageSize', String(params.pageSize))
    if (params.authorId) qs.set('authorId', params.authorId)
    const res = await apiFetch<ApiResponse<InterviewPagedResponse>>(`/api/interviews?${qs}`)
    const hasMore = res.data.page * res.data.pageSize < res.data.total
    return { interviews: res.data.items, total: res.data.total, hasMore }
  } catch {
    return { interviews: [], total: 0, hasMore: false }
  }
}

export async function getInterviewCompanies(): Promise<string[]> {
  try {
    const res = await apiFetch<ApiResponse<string[]>>('/api/interviews/companies')
    return res.data
  } catch {
    return []
  }
}

export async function getInterviewRoles(): Promise<string[]> {
  try {
    const res = await apiFetch<ApiResponse<string[]>>('/api/interviews/roles')
    return res.data
  } catch {
    return []
  }
}

export async function getInterviewLocations(): Promise<string[]> {
  try {
    const res = await apiFetch<ApiResponse<string[]>>('/api/interviews/locations')
    return res.data
  } catch {
    return []
  }
}

export async function likeQuestion(questionId: string): Promise<void> {
  await apiFetch(`/api/interviews/questions/${questionId}/likes`, { method: 'POST' })
}

export async function unlikeQuestion(questionId: string): Promise<void> {
  await apiFetch(`/api/interviews/questions/${questionId}/likes`, { method: 'DELETE' })
}

export interface QuestionComment {
  id: string
  body: string
  authorId: string
  authorUsername: string
  authorDisplayName: string
  authorAvatarUrl?: string
  authorRoleTitle?: string
  voteCount: number
  createdAt: string
  parentId?: string
}

export async function getQuestionComments(questionId: string): Promise<QuestionComment[]> {
  try {
    const res = await apiFetch<ApiResponse<{ items: QuestionComment[] }>>(`/api/interviews/questions/${questionId}/comments`)
    return res.data.items
  } catch {
    return []
  }
}

export async function addQuestionComment(questionId: string, body: string): Promise<QuestionComment> {
  const res = await apiFetch<ApiResponse<QuestionComment>>(`/api/interviews/questions/${questionId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
  return res.data
}

export async function deleteQuestionComment(commentId: string): Promise<void> {
  await apiFetch(`/api/interviews/questions/comments/${commentId}`, { method: 'DELETE' })
}

export interface InterviewComment {
  id: string
  body: string
  authorId: string
  authorUsername: string
  authorDisplayName: string
  authorAvatarUrl?: string
  authorRoleTitle?: string
  voteCount: number
  createdAt: string
  parentId?: string
}

export async function getInterviewComments(interviewId: string): Promise<InterviewComment[]> {
  try {
    const res = await apiFetch<ApiResponse<{ items: InterviewComment[] }>>(`/api/interviews/${interviewId}/comments`)
    return res.data.items
  } catch {
    return []
  }
}

export async function addInterviewComment(interviewId: string, body: string): Promise<InterviewComment> {
  const res = await apiFetch<ApiResponse<InterviewComment>>(`/api/interviews/${interviewId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
  return res.data
}

export async function deleteInterviewComment(interviewId: string, commentId: string): Promise<void> {
  await apiFetch(`/api/interviews/${interviewId}/comments/${commentId}`, { method: 'DELETE' })
}

// ═══════════════════════════════════════════════════════════════════════════
// FEED API
// ═══════════════════════════════════════════════════════════════════════════

export async function getFeed(params: {
  filter?: 'for_you' | 'following' | 'trending' | 'newest'
  stackFilter?: string
  page?: number
  limit?: number
}): Promise<{ posts: Post[]; hasMore: boolean }> {
  try {
    const qs = new URLSearchParams()
    if (params.filter) qs.set('filter', params.filter)
    if (params.stackFilter) qs.set('stack', params.stackFilter)
    if (params.page) qs.set('page', String(params.page))
    if (params.limit) qs.set('limit', String(params.limit))
    const res = await apiFetch<ApiResponse<PagedResponse<ByteResponse>>>(`/api/feed?${qs}`)
    const posts = res.data.items.map(byteToPost)
    const hasMore = res.data.page * res.data.pageSize < res.data.total
    return { posts, hasMore }
  } catch {
    return { posts: [], hasMore: false }
  }
}

export async function getPost(id: string, token?: string | null): Promise<Post | null> {
  try {
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5239'
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${BASE_URL}/api/bytes/${id}`, { headers })
    if (!res.ok) throw new Error(`${res.status}`)
    const data: ApiResponse<ByteResponse> = await res.json()
    return byteToPost(data.data)
  } catch {
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE API
// ═══════════════════════════════════════════════════════════════════════════

export async function getProfile(username: string): Promise<UserResponse | null> {
  try {
    const res = await apiFetch<ApiResponse<UserResponse>>(`/api/users/username/${encodeURIComponent(username)}`)
    return res.data
  } catch {
    return null
  }
}

export async function getProfileById(userId: string): Promise<UserResponse | null> {
  try {
    const res = await apiFetch<ApiResponse<UserResponse>>(`/api/users/${encodeURIComponent(userId)}`)
    return res.data
  } catch {
    return null
  }
}

export async function getUserBytes(userId: string, params: { page?: number; pageSize?: number } = {}): Promise<{ posts: Post[]; total: number }> {
  try {
    const qs = new URLSearchParams()
    if (params.page) qs.set('page', String(params.page))
    if (params.pageSize) qs.set('pageSize', String(params.pageSize))
    qs.set('authorId', userId)
    const res = await apiFetch<ApiResponse<PagedResponse<ByteResponse>>>(`/api/bytes?${qs}`)
    return { posts: res.data.items.map(byteToPost), total: res.data.total }
  } catch {
    return { posts: [], total: 0 }
  }
}

export async function updateProfile(data: Record<string, unknown>): Promise<void> {
  await apiFetch('/api/users/me/profile', { method: 'PUT', body: JSON.stringify(data) })
}

export interface SocialLinkResponse {
  platform: string
  url: string
  label?: string
}

export async function getMySocials(): Promise<SocialLinkResponse[]> {
  try {
    const res = await apiFetch<ApiResponse<SocialLinkResponse[]>>('/api/users/me/socials')
    return res.data
  } catch {
    return []
  }
}

export async function updateMySocials(socials: SocialLinkResponse[]): Promise<void> {
  await apiFetch('/api/users/me/socials', {
    method: 'PUT',
    body: JSON.stringify({ socials }),
  })
}

export async function getFollowers(userId: string): Promise<PersonResult[]> {
  try {
    const res = await apiFetch<ApiResponse<PagedResponse<PersonResult>>>(`/api/users/${encodeURIComponent(userId)}/followers`)
    return res.data.items ?? []
  } catch {
    return []
  }
}

export async function getFollowing(userId: string): Promise<PersonResult[]> {
  try {
    const res = await apiFetch<ApiResponse<PagedResponse<PersonResult>>>(`/api/users/${encodeURIComponent(userId)}/following`)
    return res.data.items ?? []
  } catch {
    return []
  }
}

export async function uploadAvatar(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await apiFetch<ApiResponse<{ avatarUrl: string }>>('/api/users/me/avatar', {
    method: 'POST',
    body: form,
    // Don't set Content-Type — browser sets it with the correct boundary for multipart
  })
  return res.data.avatarUrl
}

export async function followUser(userId: string): Promise<void> {
  await apiFetch(`/api/users/${userId}/follow`, { method: 'POST' })
}

export async function unfollowUser(userId: string): Promise<void> {
  try {
    await apiFetch(`/api/users/${userId}/follow`, { method: 'DELETE' })
  } catch {
    // ignore 404 (already unfollowed)
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// REACTIONS API
// ═══════════════════════════════════════════════════════════════════════════

export async function toggleLike(postId: string): Promise<{ isLiked: boolean }> {
  const res = await apiFetch<ApiResponse<{ byteId: string; userId: string; isLiked: boolean }>>(
    `/api/bytes/${postId}/reactions`,
    { method: 'POST', body: JSON.stringify({ type: 'like' }) }
  )
  return { isLiked: res.data.isLiked }
}

/** @deprecated use toggleLike */
export async function likePost(postId: string): Promise<void> {
  await toggleLike(postId)
}

/** @deprecated use toggleLike */
export async function unlikePost(postId: string): Promise<void> {
  await toggleLike(postId)
}

export async function toggleBookmark(postId: string, type: 'byte' | 'interview'): Promise<{ isSaved: boolean }> {
  const url = type === 'interview'
    ? `/api/interviews/${postId}/bookmarks`
    : `/api/bytes/${postId}/bookmarks`
  const res = await apiFetch<ApiResponse<{ isSaved: boolean }>>(url, { method: 'POST' })
  return { isSaved: res.data.isSaved }
}

/** @deprecated use toggleBookmark */
export async function bookmarkPost(postId: string): Promise<void> {
  await toggleBookmark(postId, 'byte')
}

export async function sharePost(postId: string): Promise<void> {
  // No backend endpoint for share tracking yet — fire and forget
  console.log('[API] sharePost', { postId })
}

export async function reactToPost(postId: string, emoji: string): Promise<void> {
  await apiFetch(`/api/bytes/${postId}/reactions`, { method: 'POST', body: JSON.stringify({ type: emoji }) })
}

export async function getPostComments(
  postId: string,
  _params: Record<string, unknown>
): Promise<{ comments: Comment[] }> {
  try {
    const res = await apiFetch<ApiResponse<PagedResponse<{
      id: string; byteId: string; parentId?: string;
      body: string; voteCount: number; createdAt: string
      author: { id: string; username: string; displayName: string; initials: string; avatarUrl?: string | null }
    }>>>(`/api/bytes/${postId}/comments`)
    const comments: Comment[] = res.data.items.map((c) => ({
      id: c.id,
      postId,
      author: {
        id: c.author.id,
        username: c.author.username,
        displayName: c.author.displayName,
        initials: c.author.initials,
        avatarUrl: c.author.avatarUrl ?? null,
        role: '',
        company: '',
        bio: '',
        level: 1,
        xp: 0,
        xpToNextLevel: 1000,
        followers: 0,
        following: 0,
        bytes: 0,
        reactions: 0,
        streak: 0,
        techStack: [],
        feedPreferences: [],
        links: [],
        badges: [],
        isVerified: false,
        isOnline: false,
      },
      content: c.body,
      votes: c.voteCount,
      createdAt: new Date(c.createdAt).toLocaleDateString(),
    }))
    return { comments }
  } catch {
    return { comments: [] }
  }
}

export async function addComment(postId: string, comment: string): Promise<{ id: string }> {
  const res = await apiFetch<ApiResponse<{ id: string }>>(`/api/bytes/${postId}/comments`, { method: 'POST', body: JSON.stringify({ body: comment }) })
  return res.data
}

export async function voteComment(commentId: string, direction: 'up' | 'down'): Promise<void> {
  console.log('[API] voteComment — no backend endpoint yet', { commentId, direction })
}

export async function deleteComment(commentId: string): Promise<void> {
  await apiFetch(`/api/comments/${commentId}`, { method: 'DELETE' })
}

export interface Liker {
  userId: string
  username: string
  displayName: string
  isVerified: boolean
}

export async function getByteLikers(byteId: string): Promise<Liker[]> {
  try {
    const res = await apiFetch<ApiResponse<Liker[]>>(`/api/bytes/${byteId}/likes`)
    return res.data
  } catch {
    return []
  }
}

export async function getMyBytes(params: { page?: number; pageSize?: number } = {}): Promise<{ posts: Post[]; total: number }> {
  try {
    const qs = new URLSearchParams()
    if (params.page) qs.set('page', String(params.page))
    if (params.pageSize) qs.set('pageSize', String(params.pageSize))
    const res = await apiFetch<ApiResponse<PagedResponse<ByteResponse>>>(`/api/me/bytes?${qs}`)
    return { posts: res.data.items.map(byteToPost), total: res.data.total }
  } catch {
    return { posts: [], total: 0 }
  }
}

export async function getMyInterviews(params: { page?: number; pageSize?: number } = {}): Promise<{ interviews: InterviewWithQuestions[]; total: number }> {
  try {
    const qs = new URLSearchParams()
    if (params.page) qs.set('page', String(params.page))
    if (params.pageSize) qs.set('pageSize', String(params.pageSize))
    const res = await apiFetch<ApiResponse<{ items: InterviewWithQuestions[]; total: number }>>(`/api/me/interviews?${qs}`)
    return { interviews: res.data.items, total: res.data.total }
  } catch {
    return { interviews: [], total: 0 }
  }
}

export async function deleteMyByte(byteId: string): Promise<void> {
  await apiFetch(`/api/bytes/${byteId}`, { method: 'DELETE' })
}

export async function deleteMyInterview(interviewId: string): Promise<void> {
  await apiFetch(`/api/interviews/${interviewId}`, { method: 'DELETE' })
}

export async function getMyBookmarks(params: { page?: number; pageSize?: number } = {}): Promise<{ posts: Post[]; total: number }> {
  try {
    const qs = new URLSearchParams()
    if (params.page) qs.set('page', String(params.page))
    if (params.pageSize) qs.set('pageSize', String(params.pageSize))
    const res = await apiFetch<ApiResponse<PagedResponse<ByteResponse>>>(`/api/me/bookmarks?${qs}`)
    return { posts: res.data.items.map(byteToPost), total: res.data.total }
  } catch {
    return { posts: [], total: 0 }
  }
}

export async function getMyInterviewBookmarks(params: { page?: number; pageSize?: number } = {}): Promise<{ interviews: InterviewWithQuestions[]; total: number }> {
  try {
    const qs = new URLSearchParams()
    if (params.page) qs.set('page', String(params.page))
    if (params.pageSize) qs.set('pageSize', String(params.pageSize))
    const res = await apiFetch<ApiResponse<{ items: InterviewWithQuestions[]; total: number }>>(`/api/me/interview-bookmarks?${qs}`)
    return { interviews: res.data.items, total: res.data.total }
  } catch {
    return { interviews: [], total: 0 }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LOOKUP API — seniority types, domains, tech stacks
// ═══════════════════════════════════════════════════════════════════════════

export async function getSeniorityTypes(): Promise<SeniorityTypeResponse[]> {
  try {
    const res = await apiFetch<ApiResponse<SeniorityTypeResponse[]>>('/api/lookup/seniority-types')
    return res.data
  } catch {
    return []
  }
}

export async function getDomains(): Promise<DomainResponse[]> {
  try {
    const res = await apiFetch<ApiResponse<DomainResponse[]>>('/api/lookup/domains')
    return res.data
  } catch {
    return []
  }
}

export async function getSubdomains(domainId?: string): Promise<SubdomainResponse[]> {
  try {
    const qs = domainId ? `?domainId=${domainId}` : ''
    const res = await apiFetch<ApiResponse<SubdomainResponse[]>>(`/api/lookup/subdomains${qs}`)
    return res.data
  } catch {
    return []
  }
}

export async function getTechStacks(subdomainId?: string, domainId?: string): Promise<TechStackResponse[]> {
  try {
    const qs = new URLSearchParams()
    if (subdomainId) qs.set('subdomainId', subdomainId)
    if (domainId) qs.set('domainId', domainId)
    const qsStr = qs.toString() ? `?${qs.toString()}` : ''
    const res = await apiFetch<ApiResponse<TechStackResponse[]>>(`/api/lookup/tech-stacks${qsStr}`)
    return res.data
  } catch {
    return []
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ONBOARDING & SETTINGS — stored via profile update endpoint
// ═══════════════════════════════════════════════════════════════════════════

export async function saveOnboardingData(data: Record<string, unknown>): Promise<void> {
  return updateProfile(data)
}

export async function updateFeedPreferences(preferences: string[]): Promise<void> {
  await apiFetch('/api/users/me/profile', { method: 'PUT', body: JSON.stringify({ feedPreferences: preferences }) })
}

export async function updateTechStack(stack: string[]): Promise<void> {
  await apiFetch('/api/users/me/profile', { method: 'PUT', body: JSON.stringify({ techStack: stack }) })
}

// ── User Preferences ──────────────────────────────────────────────────────────

export interface UserPreferences {
  theme: string
  visibility: string
  notifReactions: boolean
  notifComments: boolean
  notifFollowers: boolean
  notifUnfollows: boolean
}

export async function getMyPreferences(): Promise<UserPreferences | null> {
  try {
    const res = await apiFetch<ApiResponse<UserPreferences>>('/api/users/me/preferences')
    return res.data
  } catch {
    return null
  }
}

export async function updatePreferences(patch: Partial<UserPreferences>): Promise<UserPreferences | null> {
  try {
    const res = await apiFetch<ApiResponse<UserPreferences>>('/api/users/me/preferences', {
      method: 'PUT',
      body: JSON.stringify(patch),
    })
    return res.data
  } catch {
    return null
  }
}

export async function updateTheme(theme: string): Promise<void> {
  await updatePreferences({ theme })
}

export async function updateNotificationSettings(settings: Partial<Pick<UserPreferences, 'notifReactions' | 'notifComments' | 'notifFollowers' | 'notifUnfollows'>>): Promise<void> {
  await updatePreferences(settings)
}

export async function updatePrivacy(value: string): Promise<void> {
  await updatePreferences({ visibility: value })
}

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH API
// ═══════════════════════════════════════════════════════════════════════════

interface SearchResponse {
  id: string
  authorId: string
  title: string
  body: string
  codeSnippet?: string
  language?: string
  tags: string[]
  type: string
  contentType: 'byte' | 'interview'
  likeCount: number
  commentCount: number
  createdAt: string
}

export interface PersonResult {
  id: string
  username: string
  displayName: string
  bio?: string
  avatarUrl?: string
  isVerified: boolean
}

export async function search(params: { query: string; type: 'bytes' | 'interviews' }): Promise<{ results: Post[]; hasMore: boolean }> {
  try {
    const qs = new URLSearchParams({ q: params.query, type: params.type, limit: '20' })
    const res = await apiFetch<ApiResponse<SearchResponse[]>>(`/api/search?${qs}`)
    const results: Post[] = res.data.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      author: { id: r.authorId, username: 'user', displayName: 'User', initials: 'U', role: '', company: '', bio: '', level: 1, xp: 0, xpToNextLevel: 1000, followers: 0, following: 0, bytes: 0, reactions: 0, streak: 0, techStack: [], feedPreferences: [], links: [], badges: [], isVerified: false, isOnline: false },
      code: r.codeSnippet ? { language: r.language ?? 'TEXT', filename: 'snippet', content: r.codeSnippet } : undefined,
      tags: r.tags ?? [],
      reactions: [],
      comments: r.commentCount,
      likes: r.likeCount,
      createdAt: new Date(r.createdAt).toLocaleDateString(),
      isLiked: false,
      isBookmarked: false,
      views: 0,
      type: r.contentType === 'interview' ? 'interview' : 'byte',
    }))
    return { results, hasMore: false }
  } catch {
    return { results: [], hasMore: false }
  }
}

export async function searchPeople(query: string): Promise<PersonResult[]> {
  try {
    const qs = new URLSearchParams({ q: query, type: 'people', limit: '20' })
    const res = await apiFetch<ApiResponse<PersonResult[]>>(`/api/search?${qs}`)
    return res.data
  } catch {
    return []
  }
}

export async function searchUsers(query: string, page: number = 1, pageSize: number = 20): Promise<{ items: UserResponse[], total: number }> {
  try {
    const qs = new URLSearchParams({
      q: query,
      type: 'people',
      page: page.toString(),
      pageSize: pageSize.toString(),
      limit: pageSize.toString()
    })
    const res = await apiFetch<ApiResponse<PersonResult[]>>(`/api/search?${qs}`)
    const items = res.data || []
    return {
      items: items as unknown as UserResponse[],
      total: items.length
    }
  } catch {
    return { items: [], total: 0 }
  }
}

export async function createInterviewWithQuestions(data: {
  title: string
  company?: string
  role?: string
  location?: string
  questions: Array<{ question: string; answer: string }>
  isAnonymous?: boolean
}): Promise<{ id: string }> {
  const res = await apiFetch<ApiResponse<{ id: string }>>('/api/interviews/with-questions', {
    method: 'POST',
    body: JSON.stringify({
      title: data.title,
      company: data.company ?? null,
      role: data.role ?? null,
      location: data.location ?? null,
      difficulty: 'medium',
      questions: data.questions,
      isAnonymous: data.isAnonymous ?? false,
    }),
  })
  return { id: res.data.id }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSE API
// ═══════════════════════════════════════════════════════════════════════════

export async function getReachEstimate(_content: string, _tags: string[]): Promise<{ reach: number }> {
  // No backend endpoint — return a plausible estimate
  return { reach: Math.floor(Math.random() * 5000) + 500 }
}

export interface DraftResponse {
  id: string
  authorId: string
  title?: string
  body?: string
  codeSnippet?: string
  language?: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export async function saveDraft(data: {
  draftId?: string
  title?: string
  content?: string
  code?: { language: string; content: string }
  tags?: string[]
}): Promise<DraftResponse> {
  const res = await apiFetch<{ data: DraftResponse }>('/api/me/drafts', {
    method: 'POST',
    body: JSON.stringify({
      draftId: data.draftId ?? null,
      title: data.title ?? null,
      body: data.content ?? null,
      codeSnippet: data.code?.content ?? null,
      language: data.code?.language ?? null,
      tags: data.tags ?? [],
    }),
  })
  return res.data
}

export async function deleteDraft(draftId: string): Promise<void> {
  await apiFetch(`/api/me/drafts/${draftId}`, { method: 'DELETE' })
}

export async function getMyDrafts(): Promise<DraftResponse[]> {
  const res = await apiFetch<{ data: { items: DraftResponse[] } }>('/api/me/drafts')
  return res.data.items ?? []
}

// ═══════════════════════════════════════════════════════════════════════════
// RAG / AI ASK API
// ═══════════════════════════════════════════════════════════════════════════

export interface SearchAskSource {
  id: string
  title: string
  contentType: string
}

export interface SearchAskResult {
  answer: string
  sources: SearchAskSource[]
}

export interface SimilarByteResponse {
  id: string
  title: string
  body: string
  authorUsername: string
  tags: string[]
  likeCount: number
  commentCount: number
}

/** Show Similar Bytes — semantic similarity using stored byte embedding */
export async function getSimilarBytes(byteId: string, limit = 10): Promise<SimilarByteResponse[]> {
  const res = await apiFetch<ApiResponse<SimilarByteResponse[]>>(`/api/bytes/${byteId}/similar?limit=${limit}`)
  return res.data
}

/** Format code via Groq — used for languages Prettier doesn't support (C#, Go, Java, Python, etc.) */
export async function formatCode(code: string, language: string): Promise<string> {
  const res = await apiFetch<ApiResponse<{ formatted: string }>>('/api/ai/format-code', {
    method: 'POST',
    body: JSON.stringify({ code, language }),
  })
  return res.data.formatted
}

/** Option B/C — semantic search + RAG answer; type=bytes|interviews|undefined for both */
export async function searchAsk(question: string, type?: 'bytes' | 'interviews'): Promise<SearchAskResult> {
  const res = await apiFetch<ApiResponse<SearchAskResult>>('/api/ai/search-ask', {
    method: 'POST',
    body: JSON.stringify({ question, type: type ?? null }),
  })
  return res.data
}

export async function updatePost(byteId: string, data: { title?: string; body?: string; codeSnippet?: string; language?: string }): Promise<{ error?: string; reason?: string }> {
  const res = await apiFetch<ApiResponse<ByteResponse> | { error: string; reason: string }>(`/api/bytes/${byteId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if ('error' in res) return res
  return {}
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS API
// ═══════════════════════════════════════════════════════════════════════════

export interface NotificationPayloadLike {
  byteId: string
  actorId: string
  actorUsername: string
  actorDisplayName: string
  actorAvatarUrl?: string
  reactionType: string
}

export interface NotificationPayloadComment {
  byteId: string
  commentId: string
  actorId: string
  actorUsername: string
  actorDisplayName: string
  actorAvatarUrl?: string
  preview: string
}

export interface NotificationPayloadBadge {
  badgeName: string
  badgeLabel: string
  badgeIcon: string
}

export interface NotificationResponse {
  id: string
  userId: string
  type: 'like' | 'comment' | 'follow' | 'badge' | 'system'
  payload: NotificationPayloadLike | NotificationPayloadComment | NotificationPayloadBadge | Record<string, unknown> | null
  read: boolean
  createdAt: string
}

export async function getNotifications(params: {
  page?: number
  pageSize?: number
  unreadOnly?: boolean
} = {}): Promise<{ notifications: NotificationResponse[]; total: number; hasMore: boolean }> {
  try {
    const qs = new URLSearchParams()
    if (params.page) qs.set('page', String(params.page))
    if (params.pageSize) qs.set('pageSize', String(params.pageSize))
    if (params.unreadOnly) qs.set('unreadOnly', 'true')
    const res = await apiFetch<ApiResponse<PagedResponse<NotificationResponse>>>(`/api/notifications?${qs}`)
    const hasMore = res.data.page * res.data.pageSize < res.data.total
    return { notifications: res.data.items, total: res.data.total, hasMore }
  } catch {
    return { notifications: [], total: 0, hasMore: false }
  }
}

export async function markNotificationRead(id: string): Promise<void> {
  try {
    await apiFetch(`/api/notifications/${id}/read`, { method: 'PUT' })
  } catch {
    // fire-and-forget
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  try {
    await apiFetch('/api/notifications/read-all', { method: 'PUT' })
  } catch {
    // fire-and-forget
  }
}

export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const res = await apiFetch<ApiResponse<number>>('/api/notifications/unread-count')
    return res.data
  } catch {
    return 0
  }
}

export async function deleteNotification(id: string): Promise<void> {
  await apiFetch(`/api/notifications/${id}`, { method: 'DELETE' })
}

export async function createPost(data: Record<string, unknown>): Promise<{ id: string }> {
  const codeObj = data.code as { language?: string; content?: string } | null | undefined
  const bodyText = String(data.content ?? data.body ?? '')
  const res = await apiFetch<ApiResponse<ByteResponse>>('/api/bytes', {
    method: 'POST',
    body: JSON.stringify({
      title: (data.title ?? bodyText.slice(0, 80)) || 'Untitled',
      body: bodyText,
      codeSnippet: codeObj?.content ?? null,
      language: codeObj?.language ?? (data.language as string | null) ?? null,
      type: data.type ?? 'byte',
    }),
  })
  return { id: res.data.id }
}
