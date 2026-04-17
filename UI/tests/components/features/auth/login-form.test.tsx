import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { LoginForm } from '@/components/features/auth/login-form'

describe('LoginForm', () => {
  it('renders without crashing (legacy stub returns null)', () => {
    const { container } = render(<LoginForm />)
    expect(container).toBeEmptyDOMElement()
  })
})
