import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { formatDate, formatTime, isRecent, timeAgo } from '@/lib/utils/date'

// Pin system time to a known value for deterministic tests
const FIXED_NOW = new Date('2026-04-15T12:00:00.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('formatDate', () => {
  it('formats a Date object in short format', () => {
    // Use noon UTC to avoid midnight-UTC → previous-day in negative-offset timezones
    const result = formatDate(new Date('2026-01-15T12:00:00.000Z'))
    expect(result).toContain('Jan')
    expect(result).toContain('15')
  })
  it('formats a date string in long format', () => {
    const result = formatDate('2026-01-15T12:00:00.000Z', 'long')
    expect(result).toContain('January')
    expect(result).toContain('2026')
  })
  it('defaults to short format', () => {
    // Use mid-month to avoid UTC-midnight timezone boundary issues
    const result = formatDate('2026-06-15T12:00:00.000Z')
    expect(result).toContain('Jun')
  })
})

describe('formatTime', () => {
  it('formats a Date object into HH:MM AM/PM', () => {
    const result = formatTime(new Date('2026-04-15T14:30:00'))
    expect(result).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i)
  })
  it('accepts a date string', () => {
    const result = formatTime('2026-04-15T09:05:00')
    expect(result).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i)
  })
})

describe('isRecent', () => {
  it('returns true for a date 1 hour ago (within 24h threshold)', () => {
    const oneHourAgo = new Date(FIXED_NOW.getTime() - 60 * 60 * 1000)
    expect(isRecent(oneHourAgo)).toBe(true)
  })
  it('returns false for a date 25 hours ago (beyond 24h default)', () => {
    const twentyFiveHoursAgo = new Date(FIXED_NOW.getTime() - 25 * 60 * 60 * 1000)
    expect(isRecent(twentyFiveHoursAgo)).toBe(false)
  })
  it('respects custom hoursThreshold', () => {
    const twoHoursAgo = new Date(FIXED_NOW.getTime() - 2 * 60 * 60 * 1000)
    expect(isRecent(twoHoursAgo, 1)).toBe(false)
    expect(isRecent(twoHoursAgo, 3)).toBe(true)
  })
  it('accepts a date string', () => {
    const recent = new Date(FIXED_NOW.getTime() - 10 * 60 * 1000).toISOString()
    expect(isRecent(recent)).toBe(true)
  })
})

describe('timeAgo', () => {
  it('returns seconds label for < 60s', () => {
    const thirtySecondsAgo = new Date(FIXED_NOW.getTime() - 30 * 1000)
    expect(timeAgo(thirtySecondsAgo)).toBe('30s ago')
  })
  it('returns minutes label for < 1h', () => {
    const tenMinutesAgo = new Date(FIXED_NOW.getTime() - 10 * 60 * 1000)
    expect(timeAgo(tenMinutesAgo)).toBe('10m ago')
  })
  it('returns hours label for < 24h', () => {
    const threeHoursAgo = new Date(FIXED_NOW.getTime() - 3 * 60 * 60 * 1000)
    expect(timeAgo(threeHoursAgo)).toBe('3h ago')
  })
  it('returns days label for >= 24h', () => {
    const twoDaysAgo = new Date(FIXED_NOW.getTime() - 2 * 24 * 60 * 60 * 1000)
    expect(timeAgo(twoDaysAgo)).toBe('2d ago')
  })
  it('accepts a date string', () => {
    const fiveMinsAgo = new Date(FIXED_NOW.getTime() - 5 * 60 * 1000).toISOString()
    expect(timeAgo(fiveMinsAgo)).toBe('5m ago')
  })
})
