import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { SUPABASE_NOT_LOADED, SUPABASE_SIGNED_OUT, SUPABASE_SIGNED_IN } from '@/tests/mocks/supabase-auth'

const mockGetCurrentUser = vi.hoisted(() => vi.fn())
const mockUseAuth = vi.hoisted(() => vi.fn())

vi.mock('@/hooks/use-auth', () => ({
  useAuth: mockUseAuth,
}))

vi.mock('@/lib/api', () => ({
  getCurrentUser: mockGetCurrentUser,
}))

import { useIsAdmin } from '@/hooks/use-is-admin'

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAuth.mockReturnValue(SUPABASE_SIGNED_OUT)
})

describe('useIsAdmin', () => {
  it('returns isLoaded:false and isAdmin:false while auth is not loaded', () => {
    mockUseAuth.mockReturnValue(SUPABASE_NOT_LOADED)
    const { result } = renderHook(() => useIsAdmin())
    expect(result.current.isAdmin).toBe(false)
    expect(result.current.isLoaded).toBe(false)
    expect(mockGetCurrentUser).not.toHaveBeenCalled()
  })

  it('returns isAdmin:false and isLoaded:true immediately when signed out', async () => {
    mockUseAuth.mockReturnValue(SUPABASE_SIGNED_OUT)
    const { result } = renderHook(() => useIsAdmin())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.isAdmin).toBe(false)
    expect(mockGetCurrentUser).not.toHaveBeenCalled()
  })

  it('returns isAdmin:true when signed in and user role is admin', async () => {
    mockUseAuth.mockReturnValue(SUPABASE_SIGNED_IN)
    mockGetCurrentUser.mockResolvedValue({ role: 'admin' })
    const { result } = renderHook(() => useIsAdmin())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.isAdmin).toBe(true)
  })

  it('returns isAdmin:false when signed in but role is not admin', async () => {
    mockUseAuth.mockReturnValue(SUPABASE_SIGNED_IN)
    mockGetCurrentUser.mockResolvedValue({ role: 'user' })
    const { result } = renderHook(() => useIsAdmin())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.isAdmin).toBe(false)
  })

  it('returns isAdmin:false and isLoaded:true when getCurrentUser throws', async () => {
    mockUseAuth.mockReturnValue(SUPABASE_SIGNED_IN)
    mockGetCurrentUser.mockRejectedValue(new Error('network error'))
    const { result } = renderHook(() => useIsAdmin())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.isAdmin).toBe(false)
  })
})
