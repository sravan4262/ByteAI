import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from '@/hooks/use-local-storage'

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useLocalStorage', () => {
  it('returns initialValue when storage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))
    expect(result.current[0]).toBe('default')
  })

  it('reads an existing value from localStorage', () => {
    localStorage.setItem('test-key', JSON.stringify('stored-value'))
    const { result } = renderHook(() => useLocalStorage('test-key', 'default'))
    expect(result.current[0]).toBe('stored-value')
  })

  it('parses JSON objects correctly', () => {
    localStorage.setItem('test-obj', JSON.stringify({ count: 42 }))
    const { result } = renderHook(() => useLocalStorage('test-obj', { count: 0 }))
    expect(result.current[0]).toEqual({ count: 42 })
  })

  it('returns initialValue when stored JSON is corrupt', () => {
    localStorage.setItem('bad-key', 'not-valid-json{{{')
    const { result } = renderHook(() => useLocalStorage('bad-key', 99))
    expect(result.current[0]).toBe(99)
  })

  it('setter updates state and persists to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))
    act(() => {
      result.current[1]('updated')
    })
    expect(result.current[0]).toBe('updated')
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify('updated'))
  })

  it('setter works with a functional updater', () => {
    localStorage.setItem('counter', JSON.stringify(5))
    const { result } = renderHook(() => useLocalStorage('counter', 0))
    act(() => {
      result.current[1]((prev) => prev + 1)
    })
    expect(result.current[0]).toBe(6)
    expect(localStorage.getItem('counter')).toBe(JSON.stringify(6))
  })

  it('logs error and does not crash when localStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    const { result } = renderHook(() => useLocalStorage('test-key', 'init'))
    act(() => {
      result.current[1]('new-value')
    })
    expect(console.error).toHaveBeenCalled()
  })
})
