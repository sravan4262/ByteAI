import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { CLERK_SIGNED_IN } from '@/tests/mocks/clerk'

const mockRouterPush    = vi.hoisted(() => vi.fn())
const mockRouterReplace = vi.hoisted(() => vi.fn())
const mockSignOut       = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const mockGetToken      = vi.hoisted(() => vi.fn().mockResolvedValue('test-token'))
const mockUseAuth       = vi.hoisted(() => vi.fn())
const mockUseUser       = vi.hoisted(() => vi.fn())
const mockUseClerk      = vi.hoisted(() => vi.fn())
const mockClearMeCache  = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: mockRouterReplace }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@clerk/nextjs', () => ({
  useAuth:  mockUseAuth,
  useUser:  mockUseUser,
  useClerk: mockUseClerk,
}))

vi.mock('@/lib/user-cache', () => ({
  clearMeCache: mockClearMeCache,
}))

import { useAuth } from '@/hooks/use-auth'

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAuth.mockReturnValue({ ...CLERK_SIGNED_IN, signOut: mockSignOut, getToken: mockGetToken })
  mockUseUser.mockReturnValue({ user: { firstName: 'Alex', lastName: 'Xu' } })
  mockUseClerk.mockReturnValue({
    client: { activeSessions: [{ id: 's1', end: vi.fn().mockResolvedValue(undefined) }] },
  })
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
      // Cookie max-age=0 effectively removes it — value should no longer be '1'
      expect(document.cookie).not.toContain('byteai_onboarded=1')
    })

    it('calls session.end() for each active session', async () => {
      const mockEnd = vi.fn().mockResolvedValue(undefined)
      mockUseClerk.mockReturnValue({
        client: { activeSessions: [{ id: 's1', end: mockEnd }, { id: 's2', end: mockEnd }] },
      })
      const { result } = renderHook(() => useAuth())
      await act(async () => { await result.current.logout() })
      expect(mockEnd).toHaveBeenCalledTimes(2)
    })

    it('still calls signOut even if session.end() throws', async () => {
      mockUseClerk.mockReturnValue({
        client: { activeSessions: [{ id: 's1', end: vi.fn().mockRejectedValue(new Error('fail')) }] },
      })
      const { result } = renderHook(() => useAuth())
      await act(async () => { await result.current.logout() })
      expect(mockSignOut).toHaveBeenCalledWith({ redirectUrl: '/' })
    })

    it('calls signOut with redirectUrl "/"', async () => {
      const { result } = renderHook(() => useAuth())
      await act(async () => { await result.current.logout() })
      expect(mockSignOut).toHaveBeenCalledWith({ redirectUrl: '/' })
    })
  })

  describe('returned values', () => {
    it('returns auth.isAuthenticated as true when signed in', () => {
      const { result } = renderHook(() => useAuth())
      expect(result.current.auth.isAuthenticated).toBe(true)
    })

    it('returns getToken function', () => {
      const { result } = renderHook(() => useAuth())
      expect(typeof result.current.getToken).toBe('function')
    })
  })
})
