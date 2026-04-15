export * from '@/lib/api/__mocks__/mock-data'
export * from '@/lib/api/__mocks__/api'

import type { Post } from '@/lib/api/__mocks__/api'
import { mockPosts } from '@/lib/api/__mocks__/mock-data'

export const makePost = (overrides: Partial<Post> = {}): Post =>
  ({ ...mockPosts[0], ...overrides })

export const makeLikedPost      = (): Post => makePost({ isLiked: true, likes: 100 })
export const makeBookmarkedPost = (): Post => makePost({ isBookmarked: true })
export const makePostWithCode   = (): Post =>
  makePost({ code: { language: 'typescript', filename: 'example.ts', content: 'const x = 1' } })
export const makePostWithoutCode = (): Post => {
  const { code: _code, ...rest } = mockPosts[0]
  return rest as Post
}
