import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const mockRouterPush    = vi.hoisted(() => vi.fn())
const mockRouterReplace = vi.hoisted(() => vi.fn())
const mockSignOut       = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }))
const mockGetSession    = vi.hoisted(() => vi.fn().mockResolvedValue({ data: { session: { user: { id: 'test-user-id' }, access_token: 'test-token' } } }))
const mockOnAuthStateChange = vi.hoisted(() => vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }))
const mockClearMeCache  = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: mockRouterReplace }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signOut: mockSignOut,
    },
  },
}))

vi.mock('@/lib/user-cache', () => ({
  clearMeCache: mockClearMeCache,
}))

import { useAuth } from '@/hooks/use-auth'

const mockSession = { user: { id: 'test-user-id' }, access_token: 'test-token' }

beforeEach(() => {
  vi.clearAllMocks()
  mockGetSession.mockResolvedValue({ data: { session: mockSession } })
  mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
  document.cookie = 'byteai_onboarded=; path=/; max-age=0'
  sessionStorage.clear()
})

describe('useAuth', () => {
  describe('completeOnboarding', () => {
    it('sets byteai_onboarded cookie and pushes to /feed', () => {
      const { result } = renderHook(() => useAuth())
      act(() => {
        result.current.completeOnboarding()
      })
      expect(document.cookie).toContain('byteai_onboarded=1')
      expect(mockRouterPush).toHaveBeenCalledWith('/feed')
    })
  })

  describe('logout', () => {
    it('calls clearMeCache', async () => {
      const { result } = renderHook(() => useAuth())
      await act(async () => { await result.current.logout() })
      expect(mockClearMeCache).toHaveBeenCalledOnce()
    })

    it('clears byteai_feed_context from sessionStorage', async () => {
      sessionStorage.setItem('byteai_feed_context', JSON.stringify({ page: 1 }))
      const { result } = renderHook(() => useAuth())
      await act(async () => { await result.current.logout() })
      expect(sessionStorage.getItem('byteai_feed_context')).toBeNull()
    })

    it('clears byteai_onboarded cookie', async () => {
      document.cookie = 'byteai_onboarded=1; path=/'
      const { result } = renderHook(() => useAuth())
      await act(async () => { await result.current.logout() })
      expect(document.cookie).not.toContain('byteai_onboarded=1')
    })

    it('calls supabase.auth.signOut()', async () => {
      const { result } = renderHook(() => useAuth())
      await act(async () => { await result.current.logout() })
      expect(mockSignOut).toHaveBeenCalledOnce()
    })

    it('redirects to "/" after logout', async () => {
      const { result } = renderHook(() => useAuth())
      await act(async () => { await result.current.logout() })
      expect(mockRouterReplace).toHaveBeenCalledWith('/')
    })
  })

  describe('returned values', () => {
    it('returns auth.isAuthenticated as true when session exists', async () => {
      const { result } = renderHook(() => useAuth())
      await act(async () => {})
      expect(result.current.auth.isAuthenticated).toBe(true)
    })

    it('returns getToken function', () => {
      const { result } = renderHook(() => useAuth())
      expect(typeof result.current.getToken).toBe('function')
    })

    it('getToken returns access_token from session', async () => {
      const { result } = renderHook(() => useAuth())
      const token = await act(async () => result.current.getToken())
      expect(token).toBe('test-token')
    })
  })
})
