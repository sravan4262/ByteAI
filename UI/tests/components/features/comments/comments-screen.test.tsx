import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Post, Comment } from '@/lib/api'

const mockGetCurrentUser = vi.hoisted(() => vi.fn())
const mockGetPostComments = vi.hoisted(() => vi.fn())
const mockAddComment = vi.hoisted(() => vi.fn())
const mockDeleteComment = vi.hoisted(() => vi.fn())
const mockToastSuccess = vi.hoisted(() => vi.fn())
const mockToastError = vi.hoisted(() => vi.fn())
const mockRouterPush = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

vi.mock('@/lib/api', () => ({
  getCurrentUser: mockGetCurrentUser,
  getPostComments: mockGetPostComments,
  addComment: mockAddComment,
  deleteComment: mockDeleteComment,
}))

vi.mock('sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}))

import { CommentsScreen } from '@/components/features/comments/comments-screen'

const makeAuthor = (overrides = {}): Post['author'] => ({
  id: 'u1',
  username: 'alice',
  displayName: 'Alice',
  initials: 'AL',
  role: 'engineer',
  company: 'acme',
  bio: '',
  level: 1,
  xp: 0,
  xpToNextLevel: 1000,
  followers: 0,
  following: 0,
  bytes: 0,
  reactions: 0,
  streak: 0,
  techStack: [],
  feedPreferences: [],
  links: [],
  badges: [],
  isVerified: false,
  isOnline: false,
  ...overrides,
})

const makePost = (): Post => ({
  id: 'post-1',
  title: 'My Test Post',
  body: 'Post body text.',
  author: makeAuthor({ id: 'u1', username: 'alice' }),
  tags: ['react'],
  reactions: [],
  comments: 2,
  likes: 5,
  createdAt: '1h ago',
  isLiked: false,
  isBookmarked: false,
  type: 'byte',
})

const makeComment = (overrides: Partial<Comment> = {}): Comment => ({
  id: 'c1',
  postId: 'post-1',
  author: makeAuthor({ id: 'u2', username: 'bob' }),
  content: 'Nice post!',
  votes: 0,
  createdAt: '30m ago',
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  mockGetCurrentUser.mockResolvedValue({ id: 'u1' })
  mockGetPostComments.mockResolvedValue({ comments: [], hasMore: false })
  mockAddComment.mockResolvedValue({ id: 'new-comment-id' })
  mockDeleteComment.mockResolvedValue(undefined)
})

describe('CommentsScreen', () => {
  it('renders the post title', async () => {
    render(<CommentsScreen post={makePost()} />)
    await waitFor(() =>
      expect(screen.getByText('My Test Post')).toBeInTheDocument()
    )
  })

  it('shows empty state when there are no comments', async () => {
    render(<CommentsScreen post={makePost()} />)
    await waitFor(() =>
      expect(screen.getByText(/No comments yet/)).toBeInTheDocument()
    )
  })

  it('renders existing comments', async () => {
    mockGetPostComments.mockResolvedValue({
      comments: [makeComment({ content: 'Great article!' })],
      hasMore: false,
    })
    render(<CommentsScreen post={makePost()} />)
    await waitFor(() =>
      expect(screen.getByText('Great article!')).toBeInTheDocument()
    )
  })

  it('submits a comment and shows it optimistically', async () => {
    const user = userEvent.setup()
    render(<CommentsScreen post={makePost()} />)
    await waitFor(() => screen.getByPlaceholderText('Add your thoughts...'))

    await user.type(screen.getByPlaceholderText('Add your thoughts...'), 'Hello world')
    await user.click(screen.getByRole('button', { name: /POST/ }))

    await waitFor(() => {
      expect(mockAddComment).toHaveBeenCalledWith('post-1', 'Hello world')
    })
    expect(mockToastSuccess).toHaveBeenCalledWith('Comment posted')
  })

  it('enforces 500-char limit on comment textarea', async () => {
    const user = userEvent.setup()
    render(<CommentsScreen post={makePost()} />)
    await waitFor(() => screen.getByPlaceholderText('Add your thoughts...'))

    const longText = 'a'.repeat(600)
    await user.type(screen.getByPlaceholderText('Add your thoughts...'), longText)
    const textarea = screen.getByPlaceholderText('Add your thoughts...') as HTMLTextAreaElement
    expect(textarea.value.length).toBeLessThanOrEqual(500)
  })

  it('shows delete button for own comments (id === currentUserId)', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'u2' })
    mockGetPostComments.mockResolvedValue({
      comments: [makeComment({ author: makeAuthor({ id: 'u2' }) })],
      hasMore: false,
    })
    render(<CommentsScreen post={makePost()} />)
    await waitFor(() =>
      expect(screen.getByTitle('Delete comment')).toBeInTheDocument()
    )
  })

  it('does not show delete button for others\' comments', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'u1' })
    mockGetPostComments.mockResolvedValue({
      comments: [makeComment({ author: makeAuthor({ id: 'u99' }) })],
      hasMore: false,
    })
    render(<CommentsScreen post={makePost()} />)
    await waitFor(() => screen.getByText('Nice post!'))
    expect(screen.queryByTitle('Delete comment')).not.toBeInTheDocument()
  })

  it('navigates to /feed when back button clicked', async () => {
    const user = userEvent.setup()
    render(<CommentsScreen post={makePost()} />)
    await user.click(screen.getByText(/BACK TO FEED/))
    expect(mockRouterPush).toHaveBeenCalledWith('/feed')
  })
})
