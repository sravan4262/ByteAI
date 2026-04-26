import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { NotificationResponse } from '@/lib/api/client'

const mockGetNotifications = vi.hoisted(() => vi.fn())
const mockMarkAllRead = vi.hoisted(() => vi.fn())
const mockMarkRead = vi.hoisted(() => vi.fn())
const mockDeleteNotification = vi.hoisted(() => vi.fn())
const mockGetUnreadCount = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api/client', () => ({
  getNotifications: mockGetNotifications,
  markNotificationRead: mockMarkRead,
  markAllNotificationsRead: mockMarkAllRead,
  getUnreadNotificationCount: mockGetUnreadCount,
  deleteNotification: mockDeleteNotification,
}))

vi.mock('framer-motion', () => ({
  motion: {
    // Strip framer-motion-only props so React 19 doesn't throw on unknown DOM attrs
    div: ({ children, initial, animate, exit, transition, layout, layoutId, variants, style, ...props }: any) => (
      <div style={style} {...props}>{children}</div>
    ),
    span: ({ children, initial, animate, exit, transition, layout, ...props }: any) => (
      <span {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

import { NotificationPanel } from '@/components/features/notifications/notification-panel'

const makeNotification = (overrides: Partial<NotificationResponse> = {}): NotificationResponse => ({
  id: 'n1',
  userId: 'u1',
  type: 'like',
  read: false,
  createdAt: new Date().toISOString(),
  payload: { actorDisplayName: 'Bob', actorUsername: 'bob' },
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  mockGetNotifications.mockResolvedValue({ notifications: [], hasMore: false })
  mockMarkAllRead.mockResolvedValue(undefined)
  mockMarkRead.mockResolvedValue(undefined)
  mockDeleteNotification.mockResolvedValue(undefined)
  mockGetUnreadCount.mockResolvedValue(0)
})

describe('NotificationPanel', () => {
  it('renders nothing when closed', () => {
    render(<NotificationPanel open={false} onClose={vi.fn()} />)
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument()
  })

  it('fetches notifications when opened', async () => {
    render(<NotificationPanel open={true} onClose={vi.fn()} />)
    await waitFor(() => expect(mockGetNotifications).toHaveBeenCalledOnce())
  })

  it('shows empty state when there are no notifications', async () => {
    mockGetNotifications.mockResolvedValue({ notifications: [], hasMore: false })
    render(<NotificationPanel open={true} onClose={vi.fn()} />)
    await waitFor(() =>
      expect(screen.getByText(/NO NOTIFICATIONS YET/)).toBeInTheDocument()
    )
  })

  it('renders notification items', async () => {
    mockGetNotifications.mockResolvedValue({
      notifications: [makeNotification({ id: 'n1', type: 'like' })],
      hasMore: false,
    })
    render(<NotificationPanel open={true} onClose={vi.fn()} />)
    await waitFor(() =>
      expect(screen.getByText(/Bob liked your byte/)).toBeInTheDocument()
    )
  })

  it('shows MARK ALL READ button when there are unread notifications', async () => {
    mockGetNotifications.mockResolvedValue({
      notifications: [makeNotification({ read: false })],
      hasMore: false,
    })
    render(<NotificationPanel open={true} onClose={vi.fn()} />)
    await waitFor(() =>
      expect(screen.getByText(/MARK ALL READ/)).toBeInTheDocument()
    )
  })

  it('calls markAllNotificationsRead when MARK ALL READ clicked', async () => {
    const user = userEvent.setup()
    mockGetNotifications.mockResolvedValue({
      notifications: [makeNotification({ read: false })],
      hasMore: false,
    })
    render(<NotificationPanel open={true} onClose={vi.fn()} onCountChange={vi.fn()} />)
    await waitFor(() => screen.getByText(/MARK ALL READ/))
    await user.click(screen.getByText(/MARK ALL READ/))
    expect(mockMarkAllRead).toHaveBeenCalledOnce()
  })

  it('calls onClose when X button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    mockGetNotifications.mockResolvedValue({ notifications: [], hasMore: false })
    render(<NotificationPanel open={true} onClose={onClose} />)
    await waitFor(() => screen.getByText('Notifications'))
    // The X button is the close button in the panel header
    const closeButtons = screen.getAllByRole('button')
    const xBtn = closeButtons.find((b) => b.querySelector('svg'))
    if (xBtn) await user.click(xBtn)
    expect(onClose).toHaveBeenCalled()
  })
})
