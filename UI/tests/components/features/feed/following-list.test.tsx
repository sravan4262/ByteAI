import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FollowingList } from '@/components/features/feed/following-list'
import type { User } from '@/lib/api'

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: '1',
  username: 'alice',
  displayName: 'Alice',
  initials: 'AL',
  role: 'ENGINEER',
  company: 'ACME',
  bio: '',
  level: 5,
  xp: 1000,
  xpToNextLevel: 500,
  followers: 100,
  following: 50,
  bytes: 10,
  reactions: 200,
  streak: 7,
  techStack: [],
  feedPreferences: [],
  links: [],
  badges: [],
  isVerified: false,
  isOnline: false,
  ...overrides,
})

describe('FollowingList', () => {
  it('renders all users with their usernames', () => {
    const users = [
      makeUser({ id: '1', username: 'alice' }),
      makeUser({ id: '2', username: 'bob' }),
    ]
    render(<FollowingList users={users} onSelectUser={vi.fn()} />)
    expect(screen.getByText('@alice')).toBeInTheDocument()
    expect(screen.getByText('@bob')).toBeInTheDocument()
  })

  it('shows user count in the header', () => {
    const users = [makeUser({ id: '1' }), makeUser({ id: '2' })]
    render(<FollowingList users={users} onSelectUser={vi.fn()} />)
    expect(screen.getByText(/PEOPLE YOU FOLLOW \(2\)/)).toBeInTheDocument()
  })

  it('shows online dot only for online users', () => {
    const users = [
      makeUser({ id: '1', username: 'online_user', isOnline: true }),
      makeUser({ id: '2', username: 'offline_user', isOnline: false }),
    ]
    const { container } = render(
      <FollowingList users={users} onSelectUser={vi.fn()} />
    )
    // Online indicator is a span with specific bg-[var(--green)] class
    const dots = container.querySelectorAll('.bg-\\[var\\(--green\\)\\].rounded-full')
    expect(dots).toHaveLength(1)
  })

  it('calls onSelectUser with the correct user when clicked', async () => {
    const user = userEvent.setup()
    const onSelectUser = vi.fn()
    const users = [makeUser({ id: '42', username: 'charlie' })]
    render(<FollowingList users={users} onSelectUser={onSelectUser} />)

    await user.click(screen.getByRole('button'))
    expect(onSelectUser).toHaveBeenCalledWith(users[0])
  })

  it('renders role and company for each user', () => {
    const users = [makeUser({ id: '1', role: 'SR. ENG', company: 'STRIPE' })]
    render(<FollowingList users={users} onSelectUser={vi.fn()} />)
    expect(screen.getByText(/SR. ENG @ STRIPE/)).toBeInTheDocument()
  })
})
