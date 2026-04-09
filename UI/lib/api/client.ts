// ═══════════════════════════════════════════════════════════════════════════
// ByteAI API Placeholder Functions
// Replace these with your actual API implementations
// ═══════════════════════════════════════════════════════════════════════════

import { mockInterviewPosts, mockPosts, mockTrendingPosts } from './__mocks__/mock-data'

// Domain types
export type {
  User,
  BytePost,
  Badge,
  Reaction,
  Bookmark,
  Notification,
} from '../types'

// Frontend Post and Comment types (match mock data shape used by all screens)
export type { Post, Comment } from './__mocks__/api'

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

export async function loginWithGoogle(): Promise<{ success: boolean }> {
  // TODO: Implement Google OAuth
  console.log('[API] loginWithGoogle')
  return { success: true }
}

export async function loginWithFacebook(): Promise<{ success: boolean }> {
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

export async function verifyOTP(otp: string): Promise<{ success: boolean }> {
  // TODO: Implement OTP verification
  console.log('[API] verifyOTP', { otp })
  return { success: true }
}

export async function logout(): Promise<void> {
  // TODO: Implement logout
  console.log('[API] logout')
}

export async function getCurrentUser() {
  // TODO: Implement get current user
  console.log('[API] getCurrentUser')
  return null
}

// ═══════════════════════════════════════════════════════════════════════════
// FEED API
// ═══════════════════════════════════════════════════════════════════════════

export async function getFeed(params: {
  filter?: 'for_you' | 'following' | 'trending' | 'newest'
  stackFilter?: string
  page?: number
  limit?: number
}) {
  console.log('[API] getFeed', params)
  let posts = [...mockPosts]
  if (params.filter === 'trending') {
    posts = [...mockTrendingPosts]
  }
  return { posts, hasMore: false }
}

export async function getPost(id: string) {
  console.log('[API] getPost', { id })
  const allPosts = [...mockPosts, ...mockInterviewPosts, ...mockTrendingPosts]
  return allPosts.find((post) => post.id === id) ?? null
}

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE API
// ═══════════════════════════════════════════════════════════════════════════

export async function getProfile(username: string) {
  console.log('[API] getProfile', { username })
  return null
}

export async function updateProfile(data: Record<string, unknown>) {
  console.log('[API] updateProfile', data)
  return { success: true }
}

export async function followUser(username: string) {
  console.log('[API] followUser', { username })
  return { success: true }
}

export async function unfollowUser(username: string) {
  console.log('[API] unfollowUser', { username })
  return { success: true }
}

// ═══════════════════════════════════════════════════════════════════════════
// REACTIONS API
// ═══════════════════════════════════════════════════════════════════════════

export async function likePost(postId: string): Promise<void> {
  console.log('[API] likePost', { postId })
}

export async function unlikePost(postId: string): Promise<void> {
  console.log('[API] unlikePost', { postId })
}

export async function bookmarkPost(postId: string): Promise<void> {
  console.log('[API] bookmarkPost', { postId })
}

export async function sharePost(postId: string): Promise<void> {
  console.log('[API] sharePost', { postId })
}

export async function reactToPost(postId: string, emoji: string): Promise<void> {
  console.log('[API] reactToPost', { postId, emoji })
}

export async function addComment(postId: string, comment: string): Promise<void> {
  console.log('[API] addComment', { postId, comment })
}

export async function voteComment(commentId: string, direction: 'up' | 'down'): Promise<void> {
  console.log('[API] voteComment', { commentId, direction })
}

// ═══════════════════════════════════════════════════════════════════════════
// ONBOARDING API
// ═══════════════════════════════════════════════════════════════════════════

export async function saveOnboardingData(data: Record<string, unknown>): Promise<{ success: boolean }> {
  console.log('[API] saveOnboardingData', data)
  return { success: true }
}

// ═══════════════════════════════════════════════════════════════════════════
// USER SETTINGS API
// ═══════════════════════════════════════════════════════════════════════════

export async function updateFeedPreferences(preferences: string[]): Promise<void> {
  console.log('[API] updateFeedPreferences', { preferences })
}

export async function updateTechStack(stack: string[]): Promise<void> {
  console.log('[API] updateTechStack', { stack })
}

export async function updateTheme(theme: 'dark' | 'darker' | 'oled'): Promise<void> {
  console.log('[API] updateTheme', { theme })
}

export async function updateNotificationSettings(settings: Record<string, boolean>): Promise<void> {
  console.log('[API] updateNotificationSettings', settings)
}

export async function updatePrivacy(value: string): Promise<void> {
  console.log('[API] updatePrivacy', { value })
}

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH API
// ═══════════════════════════════════════════════════════════════════════════

export async function search(params: { query: string; filter: 'all' | 'bytes' | 'devs' | 'topics' | 'code' }) {
  console.log('[API] search', params)
  return { results: [], hasMore: false }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSE API
// ═══════════════════════════════════════════════════════════════════════════

export async function getReachEstimate(content: string, tags: string[]): Promise<{ reach: number }> {
  console.log('[API] getReachEstimate', { content, tags })
  return { reach: Math.floor(Math.random() * 5000) + 500 }
}

export async function saveDraft(data: Record<string, unknown>): Promise<void> {
  console.log('[API] saveDraft', data)
}

export async function createPost(data: Record<string, unknown>): Promise<{ id: string }> {
  console.log('[API] createPost', data)
  return { id: crypto.randomUUID() }
}
