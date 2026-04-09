/**
 * Route Paths - Single source of truth for navigation
 */

export const ROUTES = {
  HOME: '/',
  AUTH: '/',
  ONBOARDING: '/onboarding',
  FEED: '/feed',
  PROFILE: (username: string) => `/profile/${username}`,
  COMPOSE: '/compose',
  POST_DETAIL: (id: string) => `/post/${id}`,
  POST_COMMENTS: (id: string) => `/post/${id}/comments`,
  SEARCH: '/search',
  INTERVIEWS: '/interviews',
} as const
