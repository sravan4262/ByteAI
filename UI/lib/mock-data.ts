// Re-export all mock data from the canonical location.
// Components import from '@/lib/mock-data' — this barrel keeps that alias working.
export * from './api/__mocks__/mock-data'
export type { Post, Comment } from './api/__mocks__/api'
