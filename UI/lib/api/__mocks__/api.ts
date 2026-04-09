// Frontend-facing Post and Comment types used by components and mock data.
// These match the shape the UI renders (body, code block, reactions array, etc.)
// and will eventually align with the API response DTOs.

import type { User, Badge } from '../../types'

export type { User, Badge }

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
