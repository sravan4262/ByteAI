import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockCompleteOnboarding = vi.hoisted(() => vi.fn())
const mockGetSeniorityTypes = vi.hoisted(() => vi.fn())
const mockGetDomains = vi.hoisted(() => vi.fn())
const mockGetTechStacks = vi.hoisted(() => vi.fn())
const mockSaveOnboardingData = vi.hoisted(() => vi.fn())
const mockSetTokenProvider = vi.hoisted(() => vi.fn())

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ completeOnboarding: mockCompleteOnboarding }),
}))

vi.mock('@/lib/api/http', () => ({
  setTokenProvider: mockSetTokenProvider,
}))

vi.mock('@/lib/api', () => ({
  getSeniorityTypes: mockGetSeniorityTypes,
  getDomains: mockGetDomains,
  getTechStacks: mockGetTechStacks,
  saveOnboardingData: mockSaveOnboardingData,
}))

vi.mock('@/components/layout/phone-frame', () => ({
  PhoneFrame: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="phone-frame">{children}</div>
  ),
}))

vi.mock('@/components/layout/byteai-logo', () => ({
  ByteAILogo: () => <div data-testid="byteai-logo" />,
}))

import { OnboardingScreen } from '@/components/features/onboarding/onboarding-screen'

const SENIORITY_OPTIONS = [
  { id: 's1', name: 'JUNIOR', label: 'Junior', icon: '🌱' },
  { id: 's2', name: 'MID', label: 'Mid-Level', icon: '🚀' },
]

const DOMAIN_OPTIONS = [
  { id: 'd1', name: 'FRONTEND', label: 'Frontend', icon: '🎨' },
  { id: 'd2', name: 'BACKEND', label: 'Backend', icon: '⚙️' },
]

const TECH_OPTIONS = [
  { id: 't1', name: 'REACT', label: 'React' },
  { id: 't2', name: 'VUE', label: 'Vue' },
  { id: 't3', name: 'ANGULAR', label: 'Angular' },
  { id: 't4', name: 'SVELTE', label: 'Svelte' },
  { id: 't5', name: 'SOLID', label: 'Solid' },
  { id: 't6', name: 'QWIK', label: 'Qwik' },
  { id: 't7', name: 'ASTRO', label: 'Astro' },
]

beforeEach(() => {
  vi.clearAllMocks()
  mockGetSeniorityTypes.mockResolvedValue(SENIORITY_OPTIONS)
  mockGetDomains.mockResolvedValue(DOMAIN_OPTIONS)
  mockGetTechStacks.mockResolvedValue(TECH_OPTIONS)
  mockSaveOnboardingData.mockResolvedValue(undefined)
})

describe('OnboardingScreen', () => {
  it('loads and renders seniority options', async () => {
    render(<OnboardingScreen />)
    await waitFor(() => expect(screen.getByText('Junior')).toBeInTheDocument())
    expect(screen.getByText('Mid-Level')).toBeInTheDocument()
  })

  it('advances to domain step when a seniority is selected', async () => {
    const user = userEvent.setup()
    render(<OnboardingScreen />)
    await waitFor(() => screen.getByText('Junior'))
    await user.click(screen.getByText('Junior'))
    await waitFor(() => expect(screen.getByText('Frontend')).toBeInTheDocument())
  })

  it('calls getTechStacks when a domain is selected', async () => {
    const user = userEvent.setup()
    render(<OnboardingScreen />)
    await waitFor(() => screen.getByText('Junior'))
    await user.click(screen.getByText('Junior'))
    await waitFor(() => screen.getByText('Frontend'))
    await user.click(screen.getByText('Frontend'))
    await waitFor(() => expect(mockGetTechStacks).toHaveBeenCalled())
  })

  it('shows tech stack options after domain selection', async () => {
    const user = userEvent.setup()
    render(<OnboardingScreen />)
    await waitFor(() => screen.getByText('Junior'))
    await user.click(screen.getByText('Junior'))
    await waitFor(() => screen.getByText('Frontend'))
    await user.click(screen.getByText('Frontend'))
    await waitFor(() => expect(screen.getByText('React')).toBeInTheDocument())
  })

  it('enforces max 6 tech stack selections', async () => {
    const user = userEvent.setup()
    render(<OnboardingScreen />)
    await waitFor(() => screen.getByText('Junior'))
    await user.click(screen.getByText('Junior'))
    await waitFor(() => screen.getByText('Frontend'))
    await user.click(screen.getByText('Frontend'))
    await waitFor(() => screen.getByText('React'))

    // Select 6 tech items
    for (const tech of ['React', 'Vue', 'Angular', 'Svelte', 'Solid', 'Qwik']) {
      await user.click(screen.getByText(tech))
    }
    expect(screen.getByText('6/6 selected')).toBeInTheDocument()

    // 7th item should be disabled
    const astroBtn = screen.getByText('Astro').closest('button')
    expect(astroBtn).toBeDisabled()
  })

  it('calls saveOnboardingData and completeOnboarding on submit', async () => {
    const user = userEvent.setup()
    render(<OnboardingScreen />)
    await waitFor(() => screen.getByText('Junior'))
    await user.click(screen.getByText('Junior'))
    await waitFor(() => screen.getByText('Frontend'))
    await user.click(screen.getByText('Frontend'))
    await waitFor(() => screen.getByText('React'))
    await user.click(screen.getByText('React'))
    await user.click(screen.getByText('Continue →'))
    await waitFor(() => screen.getByText('ENTER BYTEAI →'))
    await user.click(screen.getByText('ENTER BYTEAI →'))

    await waitFor(() => expect(mockSaveOnboardingData).toHaveBeenCalled())
    expect(mockCompleteOnboarding).toHaveBeenCalled()
  })
})
