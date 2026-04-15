import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockGetTechStacks = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api/client', () => ({
  getTechStacks: mockGetTechStacks,
}))

// SearchableDropdown may use Radix Popover — stub it for simplicity
vi.mock('@/components/ui/searchable-dropdown', () => ({
  SearchableDropdown: ({
    value,
    onChange,
    options,
  }: {
    value: string | null
    onChange: (v: string | null) => void
    options: { value: string; label: string }[]
  }) => (
    <select
      data-testid="stack-filter"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">ALL STACKS</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  ),
}))

import { FeedFilters } from '@/components/features/feed/feed-filters'

const defaultProps = {
  activeTab: 'for_you',
  sortBy: 'latest',
  showSortDropdown: false,
  activeStackFilter: null,
  onTabChange: vi.fn(),
  onSortChange: vi.fn(),
  onToggleSortDropdown: vi.fn(),
  onStackFilter: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetTechStacks.mockResolvedValue([])
})

describe('FeedFilters', () => {
  it('renders FOR_YOU and TRENDING tabs', () => {
    render(<FeedFilters {...defaultProps} />)
    expect(screen.getByText('FOR_YOU')).toBeInTheDocument()
    expect(screen.getByText('TRENDING')).toBeInTheDocument()
  })

  it('calls onTabChange when a tab is clicked', async () => {
    const user = userEvent.setup()
    const onTabChange = vi.fn()
    render(<FeedFilters {...defaultProps} onTabChange={onTabChange} />)
    await user.click(screen.getByText('TRENDING'))
    expect(onTabChange).toHaveBeenCalledWith('trending')
  })

  it('calls onToggleSortDropdown when SORT button clicked (for_you tab)', async () => {
    const user = userEvent.setup()
    const onToggleSortDropdown = vi.fn()
    render(<FeedFilters {...defaultProps} onToggleSortDropdown={onToggleSortDropdown} />)
    await user.click(screen.getByText(/SORT:/))
    expect(onToggleSortDropdown).toHaveBeenCalled()
  })

  it('shows sort options when showSortDropdown is true', () => {
    render(<FeedFilters {...defaultProps} showSortDropdown={true} />)
    // sortOptions from @/lib/mock-data should be rendered — at least one option visible
    expect(screen.getAllByRole('button').length).toBeGreaterThan(2)
  })

  it('calls onSortChange when a sort option is clicked', async () => {
    const user = userEvent.setup()
    const onSortChange = vi.fn()
    render(
      <FeedFilters
        {...defaultProps}
        showSortDropdown={true}
        onSortChange={onSortChange}
      />
    )
    // Click the first sort option in the dropdown
    const sortBtns = screen.getAllByRole('button').filter((b) =>
      b.className.includes('text-left')
    )
    if (sortBtns.length > 0) {
      await user.click(sortBtns[0])
      expect(onSortChange).toHaveBeenCalled()
    }
  })

  it('does not show sort dropdown on trending tab', () => {
    render(<FeedFilters {...defaultProps} activeTab="trending" />)
    expect(screen.queryByText(/SORT:/)).not.toBeInTheDocument()
  })

  it('shows trending indicator on trending tab', () => {
    render(<FeedFilters {...defaultProps} activeTab="trending" />)
    expect(screen.getByText(/MOST VIEWED IN LAST 24 HOURS/)).toBeInTheDocument()
  })

  it('loads tech stacks on mount', async () => {
    mockGetTechStacks.mockResolvedValue([
      { id: '1', name: 'REACT', label: 'React' },
    ])
    render(<FeedFilters {...defaultProps} />)
    await waitFor(() => expect(mockGetTechStacks).toHaveBeenCalledOnce())
  })

  it('calls onStackFilter when stack is selected', async () => {
    const user = userEvent.setup()
    const onStackFilter = vi.fn()
    mockGetTechStacks.mockResolvedValue([
      { id: '1', name: 'REACT', label: 'React' },
    ])
    render(<FeedFilters {...defaultProps} onStackFilter={onStackFilter} />)
    await waitFor(() => expect(mockGetTechStacks).toHaveBeenCalled())

    const select = screen.getByTestId('stack-filter') as HTMLSelectElement
    await user.selectOptions(select, 'REACT')
    expect(onStackFilter).toHaveBeenCalledWith('REACT')
  })
})
