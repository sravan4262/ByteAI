import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { CLERK_NOT_LOADED, CLERK_SIGNED_OUT, CLERK_SIGNED_IN } from '@/tests/mocks/clerk'

const mockGetCurrentUser = vi.hoisted(() => vi.fn())
const mockUseAuth = vi.hoisted(() => vi.fn())

vi.mock('@clerk/nextjs', () => ({
  useAuth: mockUseAuth,
}))

vi.mock('@/lib/api', () => ({
  getCurrentUser: mockGetCurrentUser,
}))

// Import after vi.mock — static import is fine here (no singleton state to reset)
import { useIsAdmin } from '@/hooks/use-is-admin'

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAuth.mockReturnValue(CLERK_SIGNED_OUT)
})

describe('useIsAdmin', () => {
  it('returns isLoaded:false and isAdmin:false while auth is not loaded', () => {
    mockUseAuth.mockReturnValue(CLERK_NOT_LOADED)
    const { result } = renderHook(() => useIsAdmin())
    expect(result.current.isAdmin).toBe(false)
    expect(result.current.isLoaded).toBe(false)
    expect(mockGetCurrentUser).not.toHaveBeenCalled()
  })

  it('returns isAdmin:false and isLoaded:true immediately when signed out', async () => {
    mockUseAuth.mockReturnValue(CLERK_SIGNED_OUT)
    const { result } = renderHook(() => useIsAdmin())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.isAdmin).toBe(false)
    expect(mockGetCurrentUser).not.toHaveBeenCalled()
  })

  it('returns isAdmin:true when signed in and user role is admin', async () => {
    mockUseAuth.mockReturnValue(CLERK_SIGNED_IN)
    mockGetCurrentUser.mockResolvedValue({ role: 'admin' })
    const { result } = renderHook(() => useIsAdmin())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.isAdmin).toBe(true)
  })

  it('returns isAdmin:false when signed in but role is not admin', async () => {
    mockUseAuth.mockReturnValue(CLERK_SIGNED_IN)
    mockGetCurrentUser.mockResolvedValue({ role: 'user' })
    const { result } = renderHook(() => useIsAdmin())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.isAdmin).toBe(false)
  })

  it('returns isAdmin:false and isLoaded:true when getCurrentUser throws', async () => {
    mockUseAuth.mockReturnValue(CLERK_SIGNED_IN)
    mockGetCurrentUser.mockRejectedValue(new Error('network error'))
    const { result } = renderHook(() => useIsAdmin())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
    expect(result.current.isAdmin).toBe(false)
  })
})
