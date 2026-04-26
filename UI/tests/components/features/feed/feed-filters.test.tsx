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
    value: string[]
    onChange: (v: string[]) => void
    options: { value: string; label: string }[]
  }) => (
    <select
      data-testid="stack-filter"
      value={value[0] ?? ''}
      onChange={(e) => onChange(e.target.value ? [e.target.value] : [])}
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
  activeStackFilter: [] as string[],
  onTabChange: vi.fn(),
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

  it('shows tech stack filter on for_you tab', () => {
    render(<FeedFilters {...defaultProps} />)
    expect(screen.getByText('TECH_STACK')).toBeInTheDocument()
  })

  it('hides tech stack filter on trending tab', () => {
    const { rerender } = render(<FeedFilters {...defaultProps} />)
    rerender(<FeedFilters {...defaultProps} activeTab="trending" />)
    expect(screen.queryByText('TECH_STACK')).not.toBeInTheDocument()
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
    expect(onStackFilter).toHaveBeenCalledWith(['REACT'])
  })
})
