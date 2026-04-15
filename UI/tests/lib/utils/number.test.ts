import { describe, it, expect } from 'vitest'
import { formatBytes, toK, formatNumber, clamp } from '@/lib/utils/number'

describe('formatBytes', () => {
  it('returns "0 Bytes" for 0', () => {
    expect(formatBytes(0)).toBe('0 Bytes')
  })
  it('formats bytes correctly', () => {
    expect(formatBytes(500)).toBe('500 Bytes')
  })
  it('formats KB correctly', () => {
    expect(formatBytes(1024)).toBe('1 KB')
  })
  it('formats MB correctly', () => {
    expect(formatBytes(1024 * 1024)).toBe('1 MB')
  })
  it('respects decimals parameter', () => {
    expect(formatBytes(1500, 1)).toBe('1.5 KB')
  })
})

describe('toK', () => {
  it('returns number as string below 1000', () => {
    expect(toK(999)).toBe('999')
    expect(toK(0)).toBe('0')
  })
  it('formats thousands with K suffix', () => {
    expect(toK(1000)).toBe('1.0K')
    expect(toK(1500)).toBe('1.5K')
    expect(toK(10000)).toBe('10.0K')
  })
  it('formats millions with M suffix', () => {
    expect(toK(1000000)).toBe('1.0M')
    expect(toK(2500000)).toBe('2.5M')
  })
})

describe('formatNumber', () => {
  it('formats integers with no decimals by default', () => {
    expect(formatNumber(1000)).toBe('1,000')
    expect(formatNumber(1234567)).toBe('1,234,567')
  })
  it('respects decimals parameter', () => {
    expect(formatNumber(3.14159, 2)).toBe('3.14')
  })
  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0')
  })
})

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 1, 10)).toBe(5)
  })
  it('returns min when value is below min', () => {
    expect(clamp(-5, 0, 100)).toBe(0)
  })
  it('returns max when value is above max', () => {
    expect(clamp(200, 0, 100)).toBe(100)
  })
  it('returns boundary value when exactly at min or max', () => {
    expect(clamp(0, 0, 10)).toBe(0)
    expect(clamp(10, 0, 10)).toBe(10)
  })
})
