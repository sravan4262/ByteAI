import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Module-level singletons (cachedFlags, lastFetchTime) require a fresh module
// per test — use vi.resetModules() + vi.doMock() + dynamic import inside each test.

const mockGetEnabledFeatureFlags = vi.hoisted(() => vi.fn())

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  vi.resetModules()
  // Re-register mock AFTER resetModules so the fresh dynamic import sees it
  vi.doMock('@/lib/api/feature-flags', () => ({
    getEnabledFeatureFlags: mockGetEnabledFeatureFlags,
  }))
})

afterEach(() => {
  vi.useRealTimers()
})

// Helper: flush all pending microtasks (promises) without advancing the timer clock.
// vi.advanceTimersByTimeAsync(0) ticks the clock 0ms and drains async callbacks.
async function flushPromises() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
}

describe('useAllFeatureFlags', () => {
  it('fetches flags on mount and returns them', async () => {
    mockGetEnabledFeatureFlags.mockResolvedValue({ 'my-flag': true, 'other': false })
    const { useAllFeatureFlags } = await import('@/hooks/use-feature-flags')
    const { result } = renderHook(() => useAllFeatureFlags())

    await flushPromises()

    expect(result.current).toEqual({ 'my-flag': true, 'other': false })
    expect(mockGetEnabledFeatureFlags).toHaveBeenCalledOnce()
  })

  it('returns empty object when API fails', async () => {
    mockGetEnabledFeatureFlags.mockRejectedValue(new Error('network error'))
    const { useAllFeatureFlags } = await import('@/hooks/use-feature-flags')
    const { result } = renderHook(() => useAllFeatureFlags())

    await flushPromises()

    expect(result.current).toEqual({})
  })

  it('does not re-fetch within the 60s polling window', async () => {
    mockGetEnabledFeatureFlags.mockResolvedValue({ 'flag': true })
    const { useAllFeatureFlags } = await import('@/hooks/use-feature-flags')

    const { result: r1 } = renderHook(() => useAllFeatureFlags())
    await flushPromises()
    expect(r1.current).toEqual({ 'flag': true })

    // Second hook instance — should reuse cache, not call API again
    const { result: r2 } = renderHook(() => useAllFeatureFlags())
    await flushPromises()
    expect(r2.current).toEqual({ 'flag': true })

    expect(mockGetEnabledFeatureFlags).toHaveBeenCalledOnce()
  })

  it('re-fetches after the 60s polling interval', async () => {
    mockGetEnabledFeatureFlags
      .mockResolvedValueOnce({ 'flag': true })
      .mockResolvedValueOnce({ 'flag': false })

    const { useAllFeatureFlags } = await import('@/hooks/use-feature-flags')
    const { result } = renderHook(() => useAllFeatureFlags())

    await flushPromises()
    expect(result.current['flag']).toBe(true)
    expect(mockGetEnabledFeatureFlags).toHaveBeenCalledOnce()

    // Advance exactly past the 60s polling interval — fires the setInterval once
    // then drains the resulting async fetch promise
    await act(async () => {
      await vi.advanceTimersByTimeAsync(61_000)
    })

    expect(mockGetEnabledFeatureFlags).toHaveBeenCalledTimes(2)
  })

  it('cleans up interval on unmount', async () => {
    mockGetEnabledFeatureFlags.mockResolvedValue({})
    vi.spyOn(globalThis, 'clearInterval')
    const { useAllFeatureFlags } = await import('@/hooks/use-feature-flags')
    const { unmount } = renderHook(() => useAllFeatureFlags())
    unmount()
    expect(clearInterval).toHaveBeenCalled()
  })
})

describe('useFeatureFlag', () => {
  it('returns true when the flag key is enabled', async () => {
    mockGetEnabledFeatureFlags.mockResolvedValue({ 'ai-search': true })
    const { useFeatureFlag } = await import('@/hooks/use-feature-flags')
    const { result } = renderHook(() => useFeatureFlag('ai-search'))
    await flushPromises()
    expect(result.current).toBe(true)
  })

  it('returns false when the flag key is disabled', async () => {
    mockGetEnabledFeatureFlags.mockResolvedValue({ 'ai-search': false })
    const { useFeatureFlag } = await import('@/hooks/use-feature-flags')
    const { result } = renderHook(() => useFeatureFlag('ai-search'))
    await flushPromises()
    expect(result.current).toBe(false)
  })

  it('returns false when the flag key does not exist', async () => {
    mockGetEnabledFeatureFlags.mockResolvedValue({})
    const { useFeatureFlag } = await import('@/hooks/use-feature-flags')
    const { result } = renderHook(() => useFeatureFlag('nonexistent'))
    await flushPromises()
    expect(result.current).toBe(false)
  })
})
