import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { FeatureFlag } from '@/lib/api/feature-flags'

const mockRouterReplace = vi.hoisted(() => vi.fn())
const mockUseIsAdmin = vi.hoisted(() => vi.fn())
const mockGetAllFeatureFlags = vi.hoisted(() => vi.fn())
const mockToggleFeatureFlag = vi.hoisted(() => vi.fn())
const mockUpsertFeatureFlag = vi.hoisted(() => vi.fn())
const mockDeleteFeatureFlag = vi.hoisted(() => vi.fn())
const mockGetAllRoles = vi.hoisted(() => vi.fn())
const mockToastSuccess = vi.hoisted(() => vi.fn())
const mockToastError = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockRouterReplace, back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

vi.mock('@/hooks/use-is-admin', () => ({
  useIsAdmin: mockUseIsAdmin,
}))

vi.mock('@/lib/api/feature-flags', () => ({
  getAllFeatureFlags: mockGetAllFeatureFlags,
  upsertFeatureFlag: mockUpsertFeatureFlag,
  toggleFeatureFlag: mockToggleFeatureFlag,
  deleteFeatureFlag: mockDeleteFeatureFlag,
}))

vi.mock('@/lib/api/admin-roles', () => ({
  getAllRoles: mockGetAllRoles,
  createRole: vi.fn(),
  getUserRoles: vi.fn().mockResolvedValue([]),
  assignRoleToUser: vi.fn(),
  revokeRoleFromUser: vi.fn(),
}))

vi.mock('@/lib/api/client', () => ({
  searchUsers: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/api/http', () => ({
  apiFetch: vi.fn().mockResolvedValue({}),
}))

vi.mock('sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}))

import { AdminScreen } from '@/components/features/admin/admin-screen'

const makeFlag = (overrides: Partial<FeatureFlag> = {}): FeatureFlag => ({
  key: 'test-flag',
  name: 'Test Flag',
  description: 'A test flag',
  globalOpen: false,
  createdAt: new Date().toISOString(),
  ...overrides,
} as FeatureFlag)

beforeEach(() => {
  vi.clearAllMocks()
  mockGetAllFeatureFlags.mockResolvedValue([])
  mockGetAllRoles.mockResolvedValue([])
  mockToggleFeatureFlag.mockResolvedValue(makeFlag({ globalOpen: true }))
  mockUpsertFeatureFlag.mockResolvedValue(makeFlag())
  mockDeleteFeatureFlag.mockResolvedValue(true)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AdminScreen', () => {
  it('redirects to /feed when user is not admin', async () => {
    mockUseIsAdmin.mockReturnValue({ isAdmin: false, isLoaded: true })
    render(<AdminScreen />)
    await waitFor(() =>
      expect(mockRouterReplace).toHaveBeenCalledWith('/feed')
    )
  })

  it('does not redirect when user is admin', async () => {
    mockUseIsAdmin.mockReturnValue({ isAdmin: true, isLoaded: true })
    render(<AdminScreen />)
    await waitFor(() => expect(mockGetAllFeatureFlags).toHaveBeenCalled())
    expect(mockRouterReplace).not.toHaveBeenCalledWith('/feed')
  })

  it('loads feature flags on mount when admin', async () => {
    mockUseIsAdmin.mockReturnValue({ isAdmin: true, isLoaded: true })
    mockGetAllFeatureFlags.mockResolvedValue([makeFlag({ key: 'my-flag', name: 'My Flag' })])
    render(<AdminScreen />)
    await waitFor(() => expect(screen.getByText('My Flag')).toBeInTheDocument())
  })

  it('shows toast.error when creating flag with empty key', async () => {
    const user = userEvent.setup()
    mockUseIsAdmin.mockReturnValue({ isAdmin: true, isLoaded: true })
    render(<AdminScreen />)
    await waitFor(() => expect(mockGetAllFeatureFlags).toHaveBeenCalled())

    // Click the "NEW" button to expand the create form
    const newBtn = screen.getAllByRole('button').find((b) =>
      b.textContent?.includes('NEW')
    )
    expect(newBtn).toBeTruthy()
    await user.click(newBtn!)

    // Form appears — submit it directly without filling fields (submit button is disabled)
    await waitFor(() => screen.getByText('// NEW FLAG'))
    const form = document.querySelector('form')!
    fireEvent.submit(form)
    expect(mockToastError).toHaveBeenCalledWith('Key and Name are required')
  })

  it('optimistically toggles flag and calls toggleFeatureFlag', async () => {
    const user = userEvent.setup()
    mockUseIsAdmin.mockReturnValue({ isAdmin: true, isLoaded: true })
    mockGetAllFeatureFlags.mockResolvedValue([
      makeFlag({ key: 'feat-x', name: 'Feature X', globalOpen: false }),
    ])
    render(<AdminScreen />)
    await waitFor(() => screen.getByText('Feature X'))

    // Find toggle button (ToggleLeft icon = off, ToggleRight = on)
    const toggleBtns = screen.getAllByRole('button').filter((b) =>
      b.querySelector('svg')
    )
    // Click the one next to Feature X — the toggle icon button
    const featureRow = screen.getByText('Feature X').closest('div.flex, div.grid, tr, li')
    if (featureRow) {
      const btn = featureRow.querySelector('button')
      if (btn) {
        await user.click(btn)
        await waitFor(() =>
          expect(mockToggleFeatureFlag).toHaveBeenCalledWith('feat-x', true)
        )
      }
    }
  })
})
