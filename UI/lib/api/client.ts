// ═══════════════════════════════════════════════════════════════════════════
// ByteAI API Placeholder Functions
// Replace these with your actual API implementations
// ═══════════════════════════════════════════════════════════════════════════

import { mockComments, mockInterviewPosts, mockPosts, mockTrendingPosts } from './__mocks__/mock-data'

// Types (moved to lib/types/)
export type {
  User,
  BytePost,
  Comment,
  Badge,
  Reaction,
  Bookmark,
  Notification,
} from '../types'

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
