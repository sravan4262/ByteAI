import { describe, it, expect } from 'vitest'
import { capitalize, truncate, slug, toDisplayName, isValidUsername, isValidEmail } from '@/lib/utils/string'

describe('capitalize', () => {
  it('uppercases the first character', () => {
    expect(capitalize('hello')).toBe('Hello')
  })
  it('leaves already-capitalized strings unchanged', () => {
    expect(capitalize('World')).toBe('World')
  })
  it('handles empty string', () => {
    expect(capitalize('')).toBe('')
  })
  it('handles single character', () => {
    expect(capitalize('a')).toBe('A')
  })
})

describe('truncate', () => {
  it('returns string unchanged when within limit', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })
  it('truncates and appends default suffix', () => {
    expect(truncate('hello world', 8)).toBe('hello...')
  })
  it('uses custom suffix', () => {
    // '…' has length 1, so slice is at 7-1=6: 'hello ' + '…' = 'hello …'
    expect(truncate('hello world', 7, '…')).toBe('hello …')
  })
  it('returns string unchanged when exactly at limit', () => {
    expect(truncate('hello', 5)).toBe('hello')
  })
})

describe('slug', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slug('Hello World')).toBe('hello-world')
  })
  it('removes special characters', () => {
    expect(slug('Hello, World!')).toBe('hello-world')
  })
  it('replaces underscores with hyphens', () => {
    expect(slug('hello_world')).toBe('hello-world')
  })
  it('trims leading and trailing hyphens', () => {
    expect(slug('  hello  ')).toBe('hello')
  })
  it('collapses multiple spaces into one hyphen', () => {
    expect(slug('hello   world')).toBe('hello-world')
  })
})

describe('toDisplayName', () => {
  it('converts underscores to spaces and capitalizes each word', () => {
    expect(toDisplayName('hello_world')).toBe('Hello World')
  })
  it('handles single word', () => {
    expect(toDisplayName('alex')).toBe('Alex')
  })
  it('handles multiple underscores', () => {
    expect(toDisplayName('john_doe_jr')).toBe('John Doe Jr')
  })
})

describe('isValidUsername', () => {
  it('accepts alphanumeric + underscore between 3-30 chars', () => {
    expect(isValidUsername('alex_xu')).toBe(true)
    expect(isValidUsername('user123')).toBe(true)
  })
  it('rejects usernames shorter than 3 chars', () => {
    expect(isValidUsername('ab')).toBe(false)
  })
  it('rejects usernames longer than 30 chars', () => {
    expect(isValidUsername('a'.repeat(31))).toBe(false)
  })
  it('rejects usernames with special characters', () => {
    expect(isValidUsername('hello-world')).toBe(false)
    expect(isValidUsername('user@name')).toBe(false)
  })
  it('accepts exactly 3 and 30 characters', () => {
    expect(isValidUsername('abc')).toBe(true)
    expect(isValidUsername('a'.repeat(30))).toBe(true)
  })
})

describe('isValidEmail', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true)
    expect(isValidEmail('user+tag@domain.co.uk')).toBe(true)
  })
  it('rejects emails without @', () => {
    expect(isValidEmail('notanemail')).toBe(false)
  })
  it('rejects emails without domain', () => {
    expect(isValidEmail('user@')).toBe(false)
  })
  it('rejects emails with spaces', () => {
    expect(isValidEmail('user @example.com')).toBe(false)
  })
})
