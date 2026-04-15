import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from '@/hooks/use-mobile'

function setInnerWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width })
}

afterEach(() => {
  // Reset to desktop width after each test
  setInnerWidth(1024)
})

describe('useIsMobile', () => {
  it('returns false when innerWidth >= 768 (desktop)', () => {
    setInnerWidth(1024)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('returns true when innerWidth < 768 (mobile)', () => {
    setInnerWidth(375)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('returns false at exactly 768px (boundary)', () => {
    setInnerWidth(768)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('updates when the matchMedia change event fires', () => {
    setInnerWidth(1024)

    // Capture the onChange listener registered by the hook
    let capturedOnChange: (() => void) | null = null
    const mockMql = {
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn().mockImplementation((_: string, cb: () => void) => {
        capturedOnChange = cb
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue(mockMql),
    })

    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    // Simulate resizing to mobile
    act(() => {
      setInnerWidth(375)
      capturedOnChange?.()
    })
    expect(result.current).toBe(true)
  })

  it('removes the event listener on unmount', () => {
    const mockMql = {
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue(mockMql),
    })

    const { unmount } = renderHook(() => useIsMobile())
    unmount()
    expect(mockMql.removeEventListener).toHaveBeenCalledOnce()
  })
})
