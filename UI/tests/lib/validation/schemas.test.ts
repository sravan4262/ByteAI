import { describe, it, expect } from 'vitest'
import { loginEmailSchema, signupEmailSchema } from '@/lib/validation/schemas'

describe('loginEmailSchema', () => {
  it('passes for a valid email', () => {
    const result = loginEmailSchema.safeParse({ email: 'user@example.com' })
    expect(result.success).toBe(true)
  })
  it('fails for empty email', () => {
    const result = loginEmailSchema.safeParse({ email: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('Email is required')
  })
  it('fails for invalid email format', () => {
    const result = loginEmailSchema.safeParse({ email: 'notanemail' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('Enter a valid email address')
  })
  it('fails when email field is missing', () => {
    const result = loginEmailSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('signupEmailSchema', () => {
  const valid = {
    firstName: 'Alex',
    lastName: 'Xu',
    username: 'alex_xu',
    email: 'alex@example.com',
  }

  it('passes for valid data', () => {
    expect(signupEmailSchema.safeParse(valid).success).toBe(true)
  })

  describe('firstName', () => {
    it('fails when empty', () => {
      const result = signupEmailSchema.safeParse({ ...valid, firstName: '' })
      expect(result.success).toBe(false)
    })
    it('fails when over 50 characters', () => {
      const result = signupEmailSchema.safeParse({ ...valid, firstName: 'A'.repeat(51) })
      expect(result.success).toBe(false)
    })
  })

  describe('username', () => {
    it('fails when shorter than 3 chars', () => {
      const result = signupEmailSchema.safeParse({ ...valid, username: 'ab' })
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('At least 3 characters')
    })
    it('fails when longer than 30 chars', () => {
      const result = signupEmailSchema.safeParse({ ...valid, username: 'a'.repeat(31) })
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Max 30 characters')
    })
    it('fails for special characters (hyphen)', () => {
      const result = signupEmailSchema.safeParse({ ...valid, username: 'user-name' })
      expect(result.success).toBe(false)
      expect(result.error?.issues[0].message).toBe('Letters, numbers, and _ only')
    })
    it('accepts underscores and numbers', () => {
      expect(signupEmailSchema.safeParse({ ...valid, username: 'user_123' }).success).toBe(true)
    })
  })

  describe('email', () => {
    it('fails for invalid format', () => {
      const result = signupEmailSchema.safeParse({ ...valid, email: 'bademail' })
      expect(result.success).toBe(false)
    })
    it('fails when empty', () => {
      const result = signupEmailSchema.safeParse({ ...valid, email: '' })
      expect(result.success).toBe(false)
    })
  })
})
