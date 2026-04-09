/**
 * Domain Types - Core business entities
 * Mirror the backend API response types
 */

export interface User {
  id: string
  username: string
  displayName: string
  initials: string
  role: string
  company: string
  bio: string
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
  links: Array<{ type: string; url: string; label: string }>
  badges: Badge[]
  isVerified: boolean
  isOnline: boolean
}

export interface BytePost {
  id: string
  title: string
  content: string
  author: User
  tags: string[]
  likes: number
  comments: number
  shares: number
  bookmarks: number
  timestamp: string
  isLiked: boolean
  isBookmarked: boolean
  source?: string
  embedding?: number[]
}

export interface Comment {
  id: string
  content: string
  author: User
  timestamp: string
  replies: Comment[]
  likes: number
}

export interface Badge {
  id: string
  name: string
  icon: string
  earned: boolean
}

export interface Reaction {
  id: string
  byteId: string
  userId: string
  type: 'like'
  timestamp: string
}

export interface Bookmark {
  id: string
  byteId: string
  userId: string
  timestamp: string
}

export interface Notification {
  id: string
  userId: string
  type: string
  payload: Record<string, unknown>
  read: boolean
  timestamp: string
}
