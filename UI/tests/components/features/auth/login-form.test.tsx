import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockRouterReplace = vi.hoisted(() => vi.fn())
const mockSignInCreate = vi.hoisted(() => vi.fn())
const mockSignInAttempt = vi.hoisted(() => vi.fn())
const mockSetActive = vi.hoisted(() => vi.fn())
const mockUseAuth = vi.hoisted(() => vi.fn())
const mockToastSuccess = vi.hoisted(() => vi.fn())
const mockToastError = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockRouterReplace, back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

vi.mock('@clerk/nextjs', () => ({
  useSignIn: () => ({
    signIn: {
      create: mockSignInCreate,
      attemptFirstFactor: mockSignInAttempt,
      authenticateWithRedirect: vi.fn(),
    },
    isLoaded: true,
  }),
  useAuth: mockUseAuth,
  useClerk: () => ({
    client: { activeSessions: [] },
    setActive: mockSetActive,
  }),
}))

vi.mock('sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}))

// GoogleIcon is a simple SVG — let it render as-is
vi.mock('./google-icon', () => ({
  GoogleIcon: () => <svg data-testid="google-icon" />,
}))

import { LoginForm } from '@/components/features/auth/login-form'

beforeEach(() => {
  vi.clearAllMocks()
  mockUseAuth.mockReturnValue({ isSignedIn: false })
  mockSignInCreate.mockResolvedValue(undefined)
})

describe('LoginForm', () => {
  it('renders the email input step by default', () => {
    render(<LoginForm />)
    expect(screen.getByPlaceholderText('you@domain.dev')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /SEND_OTP/ })).toBeInTheDocument()
  })

  it('shows validation error for invalid email', async () => {
    render(<LoginForm />)
    const input = screen.getByPlaceholderText('you@domain.dev') as HTMLInputElement

    // Use fireEvent + act to ensure RHF's async zodResolver flushes
    await act(async () => {
      fireEvent.change(input, { target: { value: 'not-an-email' } })
    })
    await act(async () => {
      fireEvent.submit(input.closest('form')!)
    })

    await waitFor(() =>
      expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    )
    expect(mockSignInCreate).not.toHaveBeenCalled()
  })

  it('calls signIn.create with email_code strategy on valid submit', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)
    await user.type(screen.getByPlaceholderText('you@domain.dev'), 'dev@test.io')
    await user.click(screen.getByRole('button', { name: /SEND_OTP/ }))
    await waitFor(() => expect(mockSignInCreate).toHaveBeenCalledWith({
      strategy: 'email_code',
      identifier: 'dev@test.io',
    }))
    expect(mockToastSuccess).toHaveBeenCalled()
  })

  it('shows OTP step after successful email submission', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)
    await user.type(screen.getByPlaceholderText('you@domain.dev'), 'dev@test.io')
    await user.click(screen.getByRole('button', { name: /SEND_OTP/ }))
    await waitFor(() =>
      expect(screen.getByPlaceholderText('000000')).toBeInTheDocument()
    )
  })

  it('verify button is disabled when OTP has fewer than 6 digits', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)
    // Navigate to verify step first
    await user.type(screen.getByPlaceholderText('you@domain.dev'), 'dev@test.io')
    await user.click(screen.getByRole('button', { name: /SEND_OTP/ }))
    await waitFor(() => screen.getByPlaceholderText('000000'))

    await user.type(screen.getByPlaceholderText('000000'), '123')
    const verifyBtn = screen.getByRole('button', { name: /VERIFY →/ })
    expect(verifyBtn).toBeDisabled()
  })

  it('back button returns to email step', async () => {
    const user = userEvent.setup()
    render(<LoginForm />)
    await user.type(screen.getByPlaceholderText('you@domain.dev'), 'dev@test.io')
    await user.click(screen.getByRole('button', { name: /SEND_OTP/ }))
    await waitFor(() => screen.getByText(/← BACK/))
    await user.click(screen.getByText(/← BACK/))
    expect(screen.getByPlaceholderText('you@domain.dev')).toBeInTheDocument()
  })

  it('redirects to /onboarding-check when already signed in', async () => {
    mockUseAuth.mockReturnValue({ isSignedIn: true })
    render(<LoginForm />)
    await waitFor(() =>
      expect(mockRouterReplace).toHaveBeenCalledWith('/onboarding-check')
    )
  })
})
