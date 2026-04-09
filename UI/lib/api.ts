// ═══════════════════════════════════════════════════════════════════════════
// ByteAI API Placeholder Functions
// Replace these with your actual API implementations
// ═══════════════════════════════════════════════════════════════════════════

import { mockComments, mockInterviewPosts, mockPosts, mockTrendingPosts } from './mock-data'

// Types
export interface User {
  id: string
  username: string
  displayName: string
  avatar?: string
  initials: string
  role: string
  company?: string
  bio?: string
  level: number
  xp: number
  xpToNextLevel: number
  followers: number
  following: number
  bytes: number
  reactions: number
  streak: number
  techStack: string[]
  feedPreferences: string[]
  links: { type: string; url: string; label: string }[]
  badges: Badge[]
  isVerified?: boolean
  isOnline?: boolean
}

export interface Badge {
  id: string
  name: string
  icon: string
  earned: boolean
}

export interface Post {
  id: string
  author: User
  title: string
  body: string
  code?: {
    language: string
    filename: string
    content: string
  }
  tags: string[]
  reactions: { emoji: string; count: number }[]
  comments: number
  likes?: number
  createdAt: string
  isLiked?: boolean
  isBookmarked?: boolean
  views?: number
  type?: 'byte' | 'interview'
}

export interface Comment {
  id: string
  postId?: string
  author: User
  content: string
  votes: number
  createdAt: string
  badge?: string
}

export interface SearchResult {
  type: 'byte' | 'user' | 'topic'
  data: Post | User | { name: string; count: number }
}

export interface OnboardingData {
  seniority: string
  domain: string
  techStack: string[]
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH API
// ═══════════════════════════════════════════════════════════════════════════

export async function loginWithEmail(email: string): Promise<{ success: boolean; message: string }> {
  // TODO: Implement email OTP login
  console.log('[API] loginWithEmail', { email })
  return { success: true, message: 'OTP sent to email' }
}

export async function loginWithPhone(countryCode: string, phone: string): Promise<{ success: boolean; message: string }> {
  // TODO: Implement phone OTP login
  console.log('[API] loginWithPhone', { countryCode, phone })
  return { success: true, message: 'OTP sent to phone' }
}

export async function loginWithGoogle(): Promise<{ success: boolean; user?: User }> {
  // TODO: Implement Google OAuth
  console.log('[API] loginWithGoogle')
  return { success: true }
}

export async function loginWithFacebook(): Promise<{ success: boolean; user?: User }> {
  // TODO: Implement Facebook OAuth
  console.log('[API] loginWithFacebook')
  return { success: true }
}

export async function signup(data: {
  firstName: string
  lastName: string
  username: string
  email?: string
  phone?: string
}): Promise<{ success: boolean; message: string }> {
  // TODO: Implement signup
  console.log('[API] signup', data)
  return { success: true, message: 'Account created, OTP sent' }
}

export async function verifyOTP(otp: string): Promise<{ success: boolean; user?: User }> {
  // TODO: Implement OTP verification
  console.log('[API] verifyOTP', { otp })
  return { success: true }
}

export async function logout(): Promise<void> {
  // TODO: Implement logout
  console.log('[API] logout')
}

export async function getCurrentUser(): Promise<User | null> {
  // TODO: Implement get current user
  console.log('[API] getCurrentUser')
  return null
}

// ═══════════════════════════════════════════════════════════════════════════
// ONBOARDING API
// ═══════════════════════════════════════════════════════════════════════════

export async function saveOnboardingData(data: OnboardingData): Promise<{ success: boolean }> {
  // TODO: Implement save onboarding
  console.log('[API] saveOnboardingData', data)
  return { success: true }
}

export async function checkUsernameAvailability(username: string): Promise<{ available: boolean }> {
  // TODO: Implement username check
  console.log('[API] checkUsernameAvailability', { username })
  return { available: true }
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
  console.log('[API] getFeed', params)

  let posts: Post[] = [...mockPosts]
  if (params.filter === 'trending') {
    posts = [...mockTrendingPosts]
  } else if (params.filter === 'following') {
    posts = [...mockPosts]
  }

  if (params.sort === 'newest') {
    posts = [...posts].sort((a, b) => parseTime(b.createdAt) - parseTime(a.createdAt))
  }

  return { posts, hasMore: false }
}

export async function getPost(id: string): Promise<Post | null> {
  console.log('[API] getPost', { id })
  const allPosts = [
    ...mockPosts,
    ...mockInterviewPosts,
    ...mockTrendingPosts.filter((post) => !mockPosts.some((item) => item.id === post.id)),
  ]
  return allPosts.find((post) => post.id === id) ?? null
}

export async function getPostComments(postId: string, params: {
  sort?: 'top' | 'newest'
  page?: number
  limit?: number
}): Promise<{ comments: Comment[]; hasMore: boolean }> {
  console.log('[API] getPostComments', { postId, ...params })
  const comments = mockComments.filter((comment) => comment.postId === postId)
  return { comments, hasMore: false }
}

function parseTime(timeStr: string): number {
  const value = parseInt(timeStr, 10)
  if (timeStr.includes('m')) return value
  if (timeStr.includes('h')) return value * 60
  if (timeStr.includes('d')) return value * 60 * 24
  return 0
}

export async function likePost(postId: string): Promise<{ success: boolean; likes: number }> {
  // TODO: Implement like post
  console.log('[API] likePost', { postId })
  return { success: true, likes: 0 }
}

export async function unlikePost(postId: string): Promise<{ success: boolean; likes: number }> {
  // TODO: Implement unlike post
  console.log('[API] unlikePost', { postId })
  return { success: true, likes: 0 }
}

export async function bookmarkPost(postId: string): Promise<{ success: boolean }> {
  // TODO: Implement bookmark post
  console.log('[API] bookmarkPost', { postId })
  return { success: true }
}

export async function sharePost(postId: string): Promise<{ success: boolean; shareUrl: string }> {
  // TODO: Implement share post
  console.log('[API] sharePost', { postId })
  return { success: true, shareUrl: '' }
}

export async function reactToPost(postId: string, emoji: string): Promise<{ success: boolean }> {
  // TODO: Implement reaction
  console.log('[API] reactToPost', { postId, emoji })
  return { success: true }
}

export async function addComment(postId: string, content: string): Promise<{ success: boolean; comment?: Comment }> {
  // TODO: Implement add comment
  console.log('[API] addComment', { postId, content })
  return { success: true }
}

export async function voteComment(commentId: string, direction: 'up' | 'down'): Promise<{ success: boolean; votes: number }> {
  // TODO: Implement vote comment
  console.log('[API] voteComment', { commentId, direction })
  return { success: true, votes: 0 }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSE API
// ═══════════════════════════════════════════════════════════════════════════

export async function createPost(data: {
  content: string
  code?: { language: string; content: string }
  tags: string[]
}): Promise<{ success: boolean; post?: Post }> {
  // TODO: Implement create post
  console.log('[API] createPost', data)
  return { success: true }
}

export async function saveDraft(data: {
  content: string
  code?: { language: string; content: string }
  tags: string[]
}): Promise<{ success: boolean; draftId: string }> {
  // TODO: Implement save draft
  console.log('[API] saveDraft', data)
  return { success: true, draftId: '' }
}

export async function getDrafts(): Promise<{ drafts: Array<{ id: string; content: string; createdAt: string }> }> {
  // TODO: Implement get drafts
  console.log('[API] getDrafts')
  return { drafts: [] }
}

export async function getReachEstimate(content: string, tags: string[]): Promise<{ reach: number }> {
  // TODO: Implement reach estimate
  console.log('[API] getReachEstimate', { content, tags })
  return { reach: 1200 }
}

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH API
// ═══════════════════════════════════════════════════════════════════════════

export async function search(params: {
  query: string
  filter?: 'all' | 'bytes' | 'devs' | 'topics' | 'code'
  page?: number
  limit?: number
}): Promise<{ results: SearchResult[]; total: number; hasMore: boolean }> {
  // TODO: Implement search
  console.log('[API] search', params)
  return { results: [], total: 0, hasMore: false }
}

export async function getTrendingTopics(): Promise<{ topics: Array<{ name: string; count: number }> }> {
  // TODO: Implement trending topics
  console.log('[API] getTrendingTopics')
  return { topics: [] }
}

export async function getSearchSuggestions(query: string): Promise<{ suggestions: string[] }> {
  // TODO: Implement search suggestions
  console.log('[API] getSearchSuggestions', { query })
  return { suggestions: [] }
}

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE API
// ═══════════════════════════════════════════════════════════════════════════

export async function getProfile(username: string): Promise<User | null> {
  // TODO: Implement get profile
  console.log('[API] getProfile', { username })
  return null
}

export async function updateProfile(data: Partial<User>): Promise<{ success: boolean; user?: User }> {
  // TODO: Implement update profile
  console.log('[API] updateProfile', data)
  return { success: true }
}

export async function updateAvatar(file: File): Promise<{ success: boolean; avatarUrl?: string }> {
  // TODO: Implement update avatar
  console.log('[API] updateAvatar', { fileName: file.name })
  return { success: true }
}

export async function getFollowers(username: string, params: {
  page?: number
  limit?: number
}): Promise<{ followers: User[]; hasMore: boolean }> {
  // TODO: Implement get followers
  console.log('[API] getFollowers', { username, ...params })
  return { followers: [], hasMore: false }
}

export async function getFollowing(username: string, params: {
  page?: number
  limit?: number
}): Promise<{ following: User[]; hasMore: boolean }> {
  // TODO: Implement get following
  console.log('[API] getFollowing', { username, ...params })
  return { following: [], hasMore: false }
}

export async function followUser(username: string): Promise<{ success: boolean }> {
  // TODO: Implement follow user
  console.log('[API] followUser', { username })
  return { success: true }
}

export async function unfollowUser(username: string): Promise<{ success: boolean }> {
  // TODO: Implement unfollow user
  console.log('[API] unfollowUser', { username })
  return { success: true }
}

export async function removeFollower(username: string): Promise<{ success: boolean }> {
  // TODO: Implement remove follower
  console.log('[API] removeFollower', { username })
  return { success: true }
}

export async function getUserBadges(username: string): Promise<{ badges: Badge[] }> {
  // TODO: Implement get user badges
  console.log('[API] getUserBadges', { username })
  return { badges: [] }
}

export async function getUserBytes(username: string, params: {
  page?: number
  limit?: number
}): Promise<{ posts: Post[]; hasMore: boolean }> {
  // TODO: Implement get user bytes
  console.log('[API] getUserBytes', { username, ...params })
  return { posts: [], hasMore: false }
}

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS API
// ═══════════════════════════════════════════════════════════════════════════

export async function updateTechStack(techStack: string[]): Promise<{ success: boolean }> {
  // TODO: Implement update tech stack
  console.log('[API] updateTechStack', { techStack })
  return { success: true }
}

export async function updateFeedPreferences(preferences: string[]): Promise<{ success: boolean }> {
  // TODO: Implement update feed preferences
  console.log('[API] updateFeedPreferences', { preferences })
  return { success: true }
}

export async function updateTheme(theme: 'dark' | 'darker' | 'oled'): Promise<{ success: boolean }> {
  // TODO: Implement update theme
  console.log('[API] updateTheme', { theme })
  return { success: true }
}

export async function updateNotificationSettings(settings: {
  reactions?: boolean
  comments?: boolean
  newFollowers?: boolean
}): Promise<{ success: boolean }> {
  // TODO: Implement update notification settings
  console.log('[API] updateNotificationSettings', settings)
  return { success: true }
}

export async function updatePrivacy(visibility: 'public' | 'private'): Promise<{ success: boolean }> {
  // TODO: Implement update privacy
  console.log('[API] updatePrivacy', { visibility })
  return { success: true }
}

export async function connectGithub(): Promise<{ success: boolean }> {
  // TODO: Implement connect GitHub
  console.log('[API] connectGithub')
  return { success: true }
}

export async function disconnectGithub(): Promise<{ success: boolean }> {
  // TODO: Implement disconnect GitHub
  console.log('[API] disconnectGithub')
  return { success: true }
}

export async function connectGoogle(): Promise<{ success: boolean }> {
  // TODO: Implement connect Google
  console.log('[API] connectGoogle')
  return { success: true }
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS API
// ═══════════════════════════════════════════════════════════════════════════

export async function getNotifications(params: {
  page?: number
  limit?: number
}): Promise<{ notifications: Array<{ id: string; type: string; message: string; read: boolean; createdAt: string }>; unreadCount: number }> {
  // TODO: Implement get notifications
  console.log('[API] getNotifications', params)
  return { notifications: [], unreadCount: 0 }
}

export async function markNotificationRead(id: string): Promise<{ success: boolean }> {
  // TODO: Implement mark notification read
  console.log('[API] markNotificationRead', { id })
  return { success: true }
}

export async function markAllNotificationsRead(): Promise<{ success: boolean }> {
  // TODO: Implement mark all notifications read
  console.log('[API] markAllNotificationsRead')
  return { success: true }
}
