import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UserResponse } from '@/lib/api/client'

const mockRouterPush = vi.hoisted(() => vi.fn())
const mockGetProfileById = vi.hoisted(() => vi.fn())
const mockFollowUser = vi.hoisted(() => vi.fn())
const mockUnfollowUser = vi.hoisted(() => vi.fn())
const mockGetMeCache = vi.hoisted(() => vi.fn())
const mockUseUser = vi.hoisted(() => vi.fn())
const mockToastSuccess = vi.hoisted(() => vi.fn())
const mockToastError = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

vi.mock('@/lib/api/client', () => ({
  getProfileById: mockGetProfileById,
  followUser: mockFollowUser,
  unfollowUser: mockUnfollowUser,
}))

vi.mock('@/lib/user-cache', () => ({
  getMeCache: mockGetMeCache,
}))

vi.mock('@clerk/nextjs', () => ({
  useUser: mockUseUser,
}))

vi.mock('sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, exit, transition, layout, layoutId, variants, style, ...props }: any) => (
      <div style={style} {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

import { UserMiniProfile } from '@/components/features/profile/user-mini-profile'

const defaultProps = {
  userId: 'u99',
  username: 'charlie',
  displayName: 'Charlie Day',
  initials: 'CD',
  role: 'SR. ENGINEER',
  company: 'GOOGLE',
  tags: ['react', 'typescript'],
  onClose: vi.fn(),
}

const makeProfile = (overrides: Partial<UserResponse> = {}): UserResponse => ({
  id: 'u99',
  username: 'charlie',
  displayName: 'Charlie Day',
  initials: 'CD',
  isVerified: false,
  avatarUrl: null,
  bio: null,
  roleTitle: 'Sr. Engineer',
  company: 'Google',
  followersCount: 500,
  followingCount: 100,
  bytesCount: 30,
  level: 8,
  isFollowedByMe: false,
  ...overrides,
} as UserResponse)

beforeEach(() => {
  vi.clearAllMocks()
  mockUseUser.mockReturnValue({ user: null })
  mockGetMeCache.mockReturnValue(null)
  mockGetProfileById.mockResolvedValue(makeProfile())
  mockFollowUser.mockResolvedValue(undefined)
  mockUnfollowUser.mockResolvedValue(undefined)
})

describe('UserMiniProfile', () => {
  it('renders the username', async () => {
    render(<UserMiniProfile {...defaultProps} />)
    await waitFor(() =>
      expect(screen.getByText('@charlie')).toBeInTheDocument()
    )
  })

  it('renders the display name', () => {
    render(<UserMiniProfile {...defaultProps} />)
    expect(screen.getByText('Charlie Day')).toBeInTheDocument()
  })

  it('calls onClose when X button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<UserMiniProfile {...defaultProps} onClose={onClose} />)
    const closeBtn = screen.getAllByRole('button').find((b) =>
      b.querySelector('svg')
    )
    if (closeBtn) await user.click(closeBtn)
    expect(onClose).toHaveBeenCalled()
  })

  it('shows FOLLOW button for non-followed user', () => {
    render(<UserMiniProfile {...defaultProps} />)
    // isFollowing defaults to false — FOLLOW button is rendered immediately
    expect(screen.getAllByText(/FOLLOW/).length).toBeGreaterThan(0)
  })

  it('calls followUser and shows toast on follow', async () => {
    const user = userEvent.setup()
    render(<UserMiniProfile {...defaultProps} />)

    // Find the FOLLOW button (not FOLLOWING, not PROFILE)
    const followBtn = screen.getAllByRole('button').find(
      (b) => b.textContent?.trim().endsWith('FOLLOW') && !b.textContent?.includes('UN')
    )
    expect(followBtn).toBeTruthy()
    await user.click(followBtn!)
    await waitFor(() => expect(mockFollowUser).toHaveBeenCalledWith('u99'))
    expect(mockToastSuccess).toHaveBeenCalled()
  })

  it('shows FOLLOWING when already following', async () => {
    mockGetProfileById.mockResolvedValue(makeProfile({ isFollowedByMe: true }))
    render(<UserMiniProfile {...defaultProps} />)
    await waitFor(() =>
      expect(screen.getByText(/FOLLOWING/)).toBeInTheDocument()
    )
  })

  it('navigates to profile page when PROFILE button clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<UserMiniProfile {...defaultProps} onClose={onClose} />)
    await user.click(screen.getByText(/PROFILE/))
    expect(mockRouterPush).toHaveBeenCalledWith('/u/charlie')
    expect(onClose).toHaveBeenCalled()
  })

  it('shows toast.error when follow API fails', async () => {
    const user = userEvent.setup()
    mockFollowUser.mockRejectedValue(new Error('network error'))
    render(<UserMiniProfile {...defaultProps} />)

    // FOLLOW button is rendered immediately (isFollowing=false by default)
    const followBtn = screen.getAllByRole('button').find(
      (b) => b.textContent?.trim().endsWith('FOLLOW') && !b.textContent?.includes('UN')
    )
    expect(followBtn).toBeTruthy()
    await user.click(followBtn!)
    await waitFor(() => expect(mockToastError).toHaveBeenCalled())
  })
})
